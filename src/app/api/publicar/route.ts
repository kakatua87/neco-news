import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { esAdmin } from "@/lib/auth";
import { enviarPushNotification } from "@/lib/push";
import { generarInstagramKit } from "@/lib/instagram-kit";

type Body = {
  id?: number;
  titulo?: string;
  cuerpo?: string;
  imagen_url?: string;
};

export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const payload: Record<string, string> = {
    estado: "publicada",
    fecha_publicacion: new Date().toISOString(),
  };
  if (body.titulo) payload.titulo = body.titulo;
  if (body.cuerpo) payload.cuerpo = body.cuerpo;
  if (body.imagen_url) payload.imagen_url = body.imagen_url;

  const { error } = await supabase.from("noticias").update(payload).eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Fetch noticia completa para el push
  try {
    const { data: noticia } = await supabase
      .from("noticias")
      .select("titulo, resumen_seo, cuerpo, slug, seccion, imagen_url, instagram_titulo, instagram_text")
      .eq("id", body.id)
      .single();

    if (noticia) {
      const headersList = await headers();
      const host = headersList.get("host") ?? "neco-news.vercel.app";
      const protocol = host.includes("localhost") ? "http" : "https";
      
      const seccionSlug = (noticia.seccion ?? "local")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

      const notaUrl = `${protocol}://${host}/${seccionSlug}/${noticia.slug}`;
      const cuerpoCorto = (noticia.resumen_seo || noticia.cuerpo || "").slice(0, 100);
      const titulo = body.titulo || noticia.titulo;

      // Fire and forget — no bloqueamos la respuesta. Llamada directa (no HTTP)
      // porque ya validamos la sesión arriba; evita exponer un endpoint aparte.
      enviarPushNotification({
        titulo,
        cuerpo_corto: cuerpoCorto,
        url: notaUrl,
        imagen_url: noticia.imagen_url ?? undefined,
      }).catch((e) => console.error("Error enviando push:", e));

      // Kit de Instagram (titulo/caption con IA): el scraper ya lo genera como
      // parte de la reescritura del articulo (mismo llamado que arma cuerpo,
      // resumen_seo, etc.). Esto es solo un respaldo para el caso en que esos
      // campos hayan quedado vacios (ej. noticia cargada a mano sin pasar por
      // el scraper). Fire and forget, no bloquea la respuesta ni falla la
      // publicacion si la IA falla.
      if (!noticia.instagram_titulo || !noticia.instagram_text) {
        generarInstagramKit(body.id, {
          titulo,
          cuerpo: noticia.cuerpo,
          resumen_seo: noticia.resumen_seo,
          seccion: noticia.seccion,
        }).catch((e) => console.error("Error generando kit de Instagram:", e));
      }
    }
  } catch (pushErr) {
    console.error("Error preparando push notification:", pushErr);
  }

  return NextResponse.json({ ok: true });
}
