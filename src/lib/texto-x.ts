type NoticiaParaX = {
  titulo: string;
  twitter_text: string | null;
  instagram_titulo: string | null;
};

const LIMITE = 280;
const LARGO_URL = 23; // X cuenta todo link como 23 caracteres
const CTA = "👉 Nota completa:";
const HASHTAG = /#\p{L}[\p{L}\p{N}_]*/gu;

/** Link de la nota con UTM para medir cuánto tráfico trae X. */
export function linkConUtmX(link: string): string {
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}utm_source=x&utm_medium=social&utm_campaign=nota`;
}

/**
 * Texto del tuit: el dato más relevante (twitter_text; si falta, el título) + CTA con el link + hasta 2 hashtags.
 * Siempre entra en 280 contando el link como 23: se recorta el cuerpo, nunca el link ni el CTA.
 */
export function armarTextoX(noticia: NoticiaParaX, link: string): string {
  const base = (noticia.twitter_text || noticia.instagram_titulo || noticia.titulo || "").trim();
  const hashtags = (base.match(HASHTAG) || []).slice(0, 2);
  let cuerpo = base.replace(HASHTAG, "").replace(/\s+/g, " ").trim();
  const cola = hashtags.length ? `\n\n${hashtags.join(" ")}` : "";

  const fijo = `\n\n${CTA} `.length + LARGO_URL + cola.length;
  const disponible = LIMITE - fijo;
  if (cuerpo.length > disponible) cuerpo = `${cuerpo.slice(0, Math.max(0, disponible - 1)).trimEnd()}…`;

  return `${cuerpo}\n\n${CTA} ${linkConUtmX(link)}${cola}`;
}
