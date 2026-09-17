/**
 * El cuerpo de una noticia se guarda como texto plano con bloques separados
 * por líneas en blanco. Los subtítulos usan una convención tipo markdown:
 * "## Subtítulo" (equivalente a <h2>) y "### Subtítulo" (equivalente a <h3>).
 * Una imagen inline es un bloque propio con la sintaxis "![](url)".
 * Una lista con viñetas es un bloque donde cada línea empieza con "- ".
 * El resto de los bloques son párrafos normales.
 */

import * as cheerio from "cheerio";

export type CuerpoBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "img"; url: string };

const IMG_BLOCK_RE = /^!\[\]\(([^)]+)\)$/;

export function parseCuerpo(cuerpo: string): CuerpoBlock[] {
  return cuerpo
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.startsWith("### ")) return { type: "h3" as const, text: chunk.slice(4).trim() };
      if (chunk.startsWith("## ")) return { type: "h2" as const, text: chunk.slice(3).trim() };

      const imgMatch = chunk.match(IMG_BLOCK_RE);
      if (imgMatch) return { type: "img" as const, url: imgMatch[1] };

      const lineas = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lineas.length > 0 && lineas.every((l) => l.startsWith("- "))) {
        return { type: "ul" as const, items: lineas.map((l) => l.slice(2).trim()) };
      }

      return { type: "p" as const, text: chunk };
    });
}

/** Versión sin marcadores de subtítulo/imagen/lista, para previews/meta descriptions. */
export function cuerpoPlainText(cuerpo: string): string {
  return cuerpo
    .split("\n")
    .filter((line) => !IMG_BLOCK_RE.test(line.trim()))
    .map((line) => line.replace(/^#{2,3}\s+/, "").replace(/^-\s+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


/**
 * Convierte el HTML del editor de la pestaña "Redacción" (contentEditable)
 * al formato de texto plano que espera `parseCuerpo`. Solo se preservan los
 * bloques que el sitio sabe renderizar: h2/h3, párrafos, listas con viñetas
 * e imágenes. El formato inline (negrita/cursiva) no tiene equivalente en
 * el resto del sitio, así que se descarta a propósito -- ver EditorRedaccion.
 */
export function htmlToCuerpo(html: string): string {
  const $ = cheerio.load(html, null, false);
  const bloques: string[] = [];

  const agregarImagenes = (el: any) => {
    $(el)
      .find("img")
      .each((_, img) => {
        const src = $(img).attr("src");
        if (src) bloques.push(`![](${src})`);
      });
  };

  $.root()
    .children()
    .each((_, el) => {
      const tag = (el as any).tagName?.toLowerCase();
      const $el = $(el);

      if (tag === "h2") {
        const texto = $el.text().trim();
        if (texto) bloques.push(`## ${texto}`);
      } else if (tag === "h3") {
        const texto = $el.text().trim();
        if (texto) bloques.push(`### ${texto}`);
      } else if (tag === "ul" || tag === "ol") {
        const items = $el
          .find("li")
          .map((_, li) => $(li).text().trim())
          .get()
          .filter(Boolean);
        if (items.length > 0) bloques.push(items.map((i) => `- ${i}`).join("\n"));
      } else if (tag === "img") {
        const src = $el.attr("src");
        if (src) bloques.push(`![](${src})`);
      } else if (tag === "blockquote") {
        const texto = $el.text().trim();
        if (texto) bloques.push(texto);
      } else if (tag === "p" || tag === "div") {
        const texto = $el.text().trim();
        if (texto) {
          bloques.push(texto);
        } else {
          agregarImagenes(el);
        }
      }
    });

  return bloques.join("\n\n");
}
