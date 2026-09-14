import OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface NoticiaParaKit {
  titulo: string;
  cuerpo: string | null;
  resumen_seo: string | null;
  seccion: string;
}

// Genera instagram_titulo + instagram_text con IA y los guarda en la
// noticia. Se llama automaticamente al publicar (fire-and-forget, no
// bloquea la respuesta de /api/publicar) para que el kit de Instagram
// ya este listo cuando el admin abra el tab Instagram.
export async function generarInstagramKit(noticiaId: string | number, noticia: NoticiaParaKit): Promise<void> {
  const groq = new OpenAI({
    apiKey: process.env.AI_API_KEY ?? "",
    baseURL: "https://api.groq.com/openai/v1",
  });

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      {
        role: "system",
        content:
          "Sos el community manager de Neco News, un portal de noticias de Necochea. " +
          "A partir de una noticia ya publicada, generá SOLO un JSON con dos campos:\n\n" +
          "\"instagram_titulo\": el título/gancho para la tarjeta y el copete del posteo, tipo portada de diario, " +
          "en MAYÚSCULAS, corto y directo (máx 60 caracteres), sin hashtags, sin emojis, sin punto final.\n\n" +
          "\"instagram_text\": el cuerpo del caption, en este formato exacto (todos los saltos de línea son dobles, \\n\\n):\n" +
          "- 1 o 2 párrafos cortos (2-3 oraciones cada uno) que cuenten la noticia con los datos más importantes, en tono informativo.\n" +
          "- Si hay 2 o más datos puntuales para destacar (cifras, nombres, resultados, fechas), listalos en líneas separadas " +
          "(una por línea, sin \\n\\n entre ellas) cada una empezando con un emoji relacionado al contenido.\n" +
          "- Después, como párrafo aparte, EXACTAMENTE este texto sin modificarlo: \"👉 Nota completa: Link en bio\"\n" +
          "- Como último párrafo, 3 a 5 hashtags relevantes en español, sin numerar.\n" +
          "No repitas el título dentro del texto. No menciones la fuente original. Sin markdown, sin texto extra fuera del JSON.",
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
    throw new Error("La IA no devolvió los campos esperados");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("noticias")
    .update({ instagram_titulo: parsed.instagram_titulo, instagram_text: parsed.instagram_text })
    .eq("id", noticiaId);

  if (error) {
    throw new Error(error.message);
  }
}
