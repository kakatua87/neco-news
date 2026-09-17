import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { htmlToCuerpo } from "@/lib/cuerpo";

// Admin: convierte el HTML del borrador a texto plano, lo manda al scraper
// para que la IA lo pula y genere los campos adicionales, y crea la noticia
// resultante en "noticias" con estado 'pendiente' y origen 'redaccion' (para
// que el panel la muestre separada del resto en la pestaña Pendientes).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const provider: string | undefined = body.provider;

  const supabase = createSupabaseAdminClient();
  const { data: borrador, error: fetchError } = await supabase
    .from("borradores_redaccion")
    .select("titulo, contenido_html, seccion, imagen_portada_url")
    .eq("id", id)
    .single();

  if (fetchError || !borrador) {
    return NextResponse.json({ ok: false, error: "Borrador no encontrado" }, { status: 404 });
  }

  const cuerpoPlano = htmlToCuerpo(borrador.contenido_html || "");
  if (!cuerpoPlano.trim()) {
    return NextResponse.json({ ok: false, error: "El borrador no tiene contenido" }, { status: 400 });
  }

  try {
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const res = await fetch(`${SCRAPER_URL}/procesar-redaccion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({
        titulo: borrador.titulo,
        cuerpo: cuerpoPlano,
        seccion: borrador.seccion,
        provider,
      }),
    });

    const resultado = await res.json();
    if (!res.ok || !resultado.ok) {
      return NextResponse.json(resultado, { status: res.ok ? 400 : res.status });
    }

    const { data: noticia, error: insertError } = await supabase
      .from("noticias")
      .insert({
        titulo: resultado.titulo,
        cuerpo: resultado.cuerpo,
        resumen_seo: resultado.resumen_seo ?? null,
        seccion: resultado.seccion_sugerida || borrador.seccion || "Local",
        estado: "pendiente",
        origen: "redaccion",
        imagen_url: borrador.imagen_portada_url ?? null,
        instagram_text: resultado.instagram_text ?? null,
        instagram_titulo: resultado.instagram_titulo ?? null,
        twitter_text: resultado.twitter_text ?? null,
        guion_video: resultado.guion_video ?? null,
        slug: resultado.slug,
        es_portada: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error creando noticia desde borrador de redacción:", insertError);
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    await supabase
      .from("borradores_redaccion")
      .update({ estado: "procesado", noticia_id: noticia.id, updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true, noticia_id: noticia.id });
  } catch (error: any) {
    console.error("Error proxying redacción to scraper:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
