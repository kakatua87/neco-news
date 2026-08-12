import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

type Body = {
  noticia_id?: string | number;
  titulo?: string;
  seccion?: string;
};

function buildPrompt(titulo: string, seccion: string): string {
  return (
    `Ilustración editorial fotoperiodística sobre "${titulo}", sección ${seccion} de un diario digital. ` +
    "Estilo fotografía documental realista, luz natural, sin texto, sin logos, sin marcas de agua, " +
    "sin rostros reconocibles de personas reales, ambientada en Necochea, Argentina."
  );
}

export async function POST(request: Request) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    if (!body.noticia_id || !body.titulo) {
      return NextResponse.json({ ok: false, error: "noticia_id y titulo son requeridos" }, { status: 400 });
    }

    const prompt = buildPrompt(body.titulo, body.seccion || "Local");
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true`;

    const imgRes = await fetch(pollinationsUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ ok: false, error: "No se pudo generar la imagen" }, { status: 502 });
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const extension = contentType.includes("png") ? "png" : "jpg";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const supabase = createSupabaseAdminClient();
    const path = `noticias/${body.noticia_id}-ia.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("noticias-imagenes")
      .upload(path, bytes, { contentType, upsert: true });

    if (uploadError) {
      return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("noticias-imagenes").getPublicUrl(path);
    const imagenUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("noticias")
      .update({ imagen_url: imagenUrl, imagen_fuente: "Generada con IA (Pollinations)" })
      .eq("id", body.noticia_id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imagen_url: imagenUrl });
  } catch (err: any) {
    console.error("Catch error in POST generar-imagen-ia:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
