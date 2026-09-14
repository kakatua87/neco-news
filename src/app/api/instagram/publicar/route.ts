import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { renderInstagramCard, normalizarFormato } from "../../instagram-card/render";
import sharp from "sharp";
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

  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const graphToken = process.env.INSTAGRAM_GRAPH_TOKEN;
  if (!igUserId || !graphToken) {
    return NextResponse.json(
      { ok: false, error: "Falta conectar Instagram: configurá INSTAGRAM_BUSINESS_ACCOUNT_ID e INSTAGRAM_GRAPH_TOKEN en las variables de entorno." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const noticiaId = body.noticiaId;
    const destino: "feed" | "historia" = body.destino === "historia" ? "historia" : "feed";
    const formato = normalizarFormato(body.formato);
    const imagenUrlEditada: string | undefined = body.imagenUrlEditada;

    if (!noticiaId) {
      return NextResponse.json({ ok: false, error: "Falta noticiaId" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error } = await supabase
      .from("noticias")
      .select("titulo, instagram_titulo, instagram_text, imagen_url, seccion, slug, estado")
      .eq("id", noticiaId)
      .single();

    if (error || !noticia || noticia.estado !== "publicada") {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }

    // Imagen: si ya viene editada/subida a Storage se usa esa URL; si no,
    // se genera la tarjeta ahora mismo y se sube a Storage — la API de
    // Instagram necesita una URL pública, y nuestra ruta de preview
    // requiere sesión de admin, así que no sirve pasársela directo.
    let imagenPublicaUrl = imagenUrlEditada;
    if (!imagenPublicaUrl) {
      const cardResponse = await renderInstagramCard(noticia, formato);
      const pngBytes = Buffer.from(await cardResponse.arrayBuffer());
      // Instagram solo acepta JPEG en image_url (PNG hace fallar el contenedor
      // con "Media ID is not available" al publicar). next/og unicamente genera
      // PNG, asi que lo convertimos antes de subirlo.
      const jpegBytes = await sharp(pngBytes).jpeg({ quality: 92 }).toBuffer();
      const path = `instagram-cards/${noticiaId}-${formato}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("noticias-imagenes")
        .upload(path, jpegBytes, { contentType: "image/jpeg", upsert: true });
      if (uploadError) {
        return NextResponse.json({ ok: false, error: `No se pudo preparar la imagen: ${uploadError.message}` }, { status: 500 });
      }
      const { data: publicUrlData } = supabase.storage.from("noticias-imagenes").getPublicUrl(path);
      imagenPublicaUrl = publicUrlData.publicUrl;
    }

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

    return NextResponse.json({ ok: true, publicacionId: publicarData.id });
  } catch (err) {
    console.error("Catch error in POST instagram/publicar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
