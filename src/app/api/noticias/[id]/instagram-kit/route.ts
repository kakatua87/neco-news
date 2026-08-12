import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error: fetchError } = await supabase
      .from("noticias")
      .select("titulo, cuerpo, resumen_seo, seccion")
      .eq("id", id)
      .single();

    if (fetchError || !noticia) {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }

    const groq = new OpenAI({
      apiKey: process.env.AI_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Sos el community manager de Neco News. A partir de una noticia ya publicada, " +
            "generá SOLO un JSON con: {\"instagram_titulo\": \"hook corto y atrapante, máx 60 caracteres, sin hashtags\", " +
            "\"instagram_text\": \"gancho + contexto + 3-5 emojis + hashtags relevantes, para el caption del posteo\"}. " +
            "Sin markdown, sin texto extra, sin mencionar la fuente original.",
        },
        {
          role: "user",
          content: `Sección: ${noticia.seccion}\nTítulo: ${noticia.titulo}\nResumen: ${noticia.resumen_seo || ""}\nCuerpo: ${(noticia.cuerpo || "").slice(0, 1500)}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const raw = (completion.choices[0]?.message?.content || "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned) as { instagram_titulo?: string; instagram_text?: string };

    if (!parsed.instagram_titulo || !parsed.instagram_text) {
      return NextResponse.json({ ok: false, error: "La IA no devolvió los campos esperados" }, { status: 502 });
    }

    const { error: updateError } = await supabase
      .from("noticias")
      .update({ instagram_titulo: parsed.instagram_titulo, instagram_text: parsed.instagram_text })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, instagram_titulo: parsed.instagram_titulo, instagram_text: parsed.instagram_text });
  } catch (err: any) {
    console.error("Catch error in POST instagram-kit:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
