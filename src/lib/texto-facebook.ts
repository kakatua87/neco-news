import { textoEnNegrita } from "@/lib/texto";

type NoticiaParaFacebook = {
  titulo: string;
  instagram_titulo: string | null;
  instagram_text: string | null;
};

/**
 * Texto de la publicación de Facebook, a partir del copy ya generado para Instagram: el título en "negrita"
 * Unicode, el copy sin la línea "link en bio" (en Facebook el link va en el propio texto y es clickeable) y el
 * link de la nota antes de los hashtags.
 */
export function armarTextoFacebook(noticia: NoticiaParaFacebook, link: string): string {
  const titulo = textoEnNegrita((noticia.instagram_titulo || noticia.titulo).toUpperCase());
  const lineas = (noticia.instagram_text || "").split("\n");
  const cuerpo: string[] = [];
  const hashtags: string[] = [];
  for (const linea of lineas) {
    if (/link en bio/i.test(linea)) continue;
    // Las líneas hechas solo de hashtags se llevan al final, después del link.
    if (linea.trim() && linea.trim().split(/\s+/).every((p) => p.startsWith("#"))) hashtags.push(linea.trim());
    else cuerpo.push(linea);
  }
  const copy = cuerpo.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return [titulo, copy, `👉 Nota completa: ${link}`, hashtags.join("\n")].filter(Boolean).join("\n\n");
}
