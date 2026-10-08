import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { obtenerCredencialesInstagram } from "@/lib/instagram-credenciales";
import { normalizarFormato } from "../../instagram-card/render";
import { urlPublicaDeTarjeta } from "@/lib/tarjeta-publica";
import { textoEnNegrita } from "@/lib/texto";

const GRAPH_VERSION = "v21.0";
// "API de Instagram con inicio de sesión de Instagram para empresas": las
// llamadas van contra graph.instagram.com (no graph.facebook.com, que es el
// host del producto viejo "Facebook Login for Business" ligado a una Página).
const GRAPH_HOST = "https://graph.instagram.com";

// El poll de status_code del contenedor puede tardar hasta ~25s; el timeout
// por defecto de Vercel (10s) no alcanza.
export const maxDuration = 45;


export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Credenciales guardadas en la base (las renueva solo el cron) o, si no hay, las variables de entorno.
  const credenciales = await obtenerCredencialesInstagram();
  if (!credenciales || !credenciales.igUserId) {
    return NextResponse.json(
      { ok: false, error: "Falta conectar Instagram: conectalo desde Configuración → Instagram." },
      { status: 500 }
    );
  }
  const igUserId = credenciales.igUserId;
  const graphToken = credenciales.token;

  try {
    const body = await request.json();
    const noticiaId = body.noticiaId;
    const destino: "feed" | "historia" = body.destino === "historia" ? "historia" : "feed";
    const formato = normalizarFormato(body.formato);
    const imagenUrlEditada: string | undefined = body.imagenUrlEditada;
    // Sin esto, una nota ya publicada se rechaza: evita el doble clic y que dos editores la publiquen dos veces.
    const forzar = body.forzar === true;

    if (!noticiaId) {
      return NextResponse.json({ ok: false, error: "Falta noticiaId" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error } = await supabase
      .from("noticias")
      .select("titulo, instagram_titulo, instagram_text, imagen_url, seccion, slug, estado, instagram_publicado_at")
      .eq("id", noticiaId)
      .single();

    if (error || !noticia || noticia.estado !== "publicada") {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }
    if (noticia.instagram_publicado_at && !forzar) {
      return NextResponse.json(
        { ok: false, yaPublicada: true, error: "Esta noticia ya se publicó en Instagram." },
        { status: 409 }
      );
    }

    const imagen = await urlPublicaDeTarjeta(supabase, noticia, noticiaId, formato, imagenUrlEditada);
    if (!imagen.ok) {
      return NextResponse.json({ ok: false, error: imagen.error }, { status: 500 });
    }
    const imagenPublicaUrl = imagen.url;

    // El titulo va en "negrita" (Unicode) como copete, tipo portada de diario.
    // El resto (parrafos + CTA "link en bio" + hashtags) ya viene armado asi
    // desde la generacion con IA en /api/noticias/[id]/instagram-kit.
    const titulo = textoEnNegrita((noticia.instagram_titulo || noticia.titulo).toUpperCase());
    const caption = `${titulo}\n\n${noticia.instagram_text || ""}`;

    // Paso 1: crear el contenedor de medio.
    const mediaParams = new URLSearchParams({
      image_url: imagenPublicaUrl,
      caption,
      access_token: graphToken,
    });
    if (destino === "historia") {
      mediaParams.set("media_type", "STORIES");
    }
    const crearRes = await fetch(`${GRAPH_HOST}/${GRAPH_VERSION}/${igUserId}/media`, {
      method: "POST",
      body: mediaParams,
    });
    const crearData = await crearRes.json();
    if (!crearRes.ok || !crearData.id) {
      return NextResponse.json(
        { ok: false, error: crearData?.error?.message || "Error creando el contenedor de Instagram" },
        { status: 502 }
      );
    }

    // Paso 1.5: esperar a que el contenedor termine de procesar. Publicar
    // apenas se crea (sin esperar) da "Media ID is not available" porque
    // Instagram todavia esta bajando/procesando la imagen del image_url.
    let statusCode = "IN_PROGRESS";
    for (let intento = 0; intento < 15 && statusCode === "IN_PROGRESS"; intento++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusUrl = new URL(`${GRAPH_HOST}/${GRAPH_VERSION}/${crearData.id}`);
      statusUrl.searchParams.set("fields", "status_code");
      statusUrl.searchParams.set("access_token", graphToken);
      const statusRes = await fetch(statusUrl.toString());
      const statusData = await statusRes.json();
      statusCode = statusData.status_code || "IN_PROGRESS";
    }
    if (statusCode !== "FINISHED") {
      return NextResponse.json(
        { ok: false, error: `El contenedor de Instagram no quedo listo a tiempo (estado: ${statusCode}).` },
        { status: 502 }
      );
    }

    // Paso 2: publicar el contenedor.
    const publicarParams = new URLSearchParams({
      creation_id: crearData.id,
      access_token: graphToken,
    });
    const publicarRes = await fetch(`${GRAPH_HOST}/${GRAPH_VERSION}/${igUserId}/media_publish`, {
      method: "POST",
      body: publicarParams,
    });
    const publicarData = await publicarRes.json();
    if (!publicarRes.ok || !publicarData.id) {
      return NextResponse.json(
        { ok: false, error: publicarData?.error?.message || "Error publicando en Instagram" },
        { status: 502 }
      );
    }

    // Marca de "ya publicada" + link al post. Si algo de esto falla la publicación ya salió: se avisa, no se falla.
    let permalink: string | null = null;
    try {
      const permaUrl = new URL(`${GRAPH_HOST}/${GRAPH_VERSION}/${publicarData.id}`);
      permaUrl.searchParams.set("fields", "permalink");
      permaUrl.searchParams.set("access_token", graphToken);
      const permaData = await (await fetch(permaUrl.toString())).json();
      if (typeof permaData.permalink === "string") permalink = permaData.permalink;
    } catch {
      // el permalink es un extra
    }
    const { error: marcaError } = await supabase
      .from("noticias")
      .update({
        instagram_publicado_at: new Date().toISOString(),
        instagram_post_id: String(publicarData.id),
        instagram_permalink: permalink,
      })
      .eq("id", noticiaId);
    if (marcaError) console.error("instagram/publicar: no se pudo guardar la marca de publicada:", marcaError.message);

    return NextResponse.json({
      ok: true,
      publicacionId: publicarData.id,
      permalink,
      publicadoAt: marcaError ? null : new Date().toISOString(),
      avisoMarca: marcaError ? "Se publicó, pero no se pudo guardar la marca de publicada." : undefined,
    });
  } catch (err) {
    console.error("Catch error in POST instagram/publicar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
