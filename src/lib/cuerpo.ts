/**
 * El cuerpo de una noticia se guarda como texto plano con bloques separados
 * por líneas en blanco. Los subtítulos usan una convención tipo markdown:
 * "## Subtítulo" (equivalente a <h2>) y "### Subtítulo" (equivalente a <h3>).
 * El resto de los bloques son párrafos normales.
 */

export type CuerpoBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string };

export function parseCuerpo(cuerpo: string): CuerpoBlock[] {
  return cuerpo
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (chunk.startsWith("### ")) return { type: "h3" as const, text: chunk.slice(4).trim() };
      if (chunk.startsWith("## ")) return { type: "h2" as const, text: chunk.slice(3).trim() };
      return { type: "p" as const, text: chunk };
    });
}

/** Versión sin marcadores de subtítulo, para previews/meta descriptions. */
export function cuerpoPlainText(cuerpo: string): string {
  return cuerpo
    .split("\n")
    .map((line) => line.replace(/^#{2,3}\s+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
