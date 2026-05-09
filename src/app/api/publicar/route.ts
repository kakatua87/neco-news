import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

type Body = {
  id?: number;
  titulo?: string;
  cuerpo?: string;
};

export async function POST(request: Request) {
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

  const { error } = await supabase.from("noticias").update(payload).eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Fetch noticia completa para el push
  try {
    const { data: noticia } = await supabase
      .from("noticias")
      .select("titulo, resumen_seo, cuerpo, slug, seccion, imagen_url")
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

      // Fire and forget — no bloqueamos la respuesta
      fetch(`${protocol}://${host}/api/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          cuerpo_corto: cuerpoCorto,
          url: notaUrl,
          imagen_url: noticia.imagen_url ?? undefined,
        }),
      }).catch((e) => console.error("Error enviando push:", e));
    }
  } catch (pushErr) {
    console.error("Error preparando push notification:", pushErr);
  }

  return NextResponse.json({ ok: true });
}
