/**
 * Conversión entre el formato de texto plano del cuerpo (ver lib/cuerpo.ts) y el HTML del
 * editor contentEditable del panel. Es código de navegador (usa el DOM) y a propósito no
 * importa lib/cuerpo.ts para no llevar cheerio al bundle del cliente.
 *
 * Solo se preservan los bloques que el sitio sabe renderizar: ## / ### / párrafos /
 * listas con "- " e imágenes "![](url)". Negrita, cursiva, enlaces y alineación no existen
 * en el sitio, así que no se ofrecen en el editor.
 */

const IMG_BLOCK_RE = /^!\[\]\(([^)]+)\)$/;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto plano del cuerpo → HTML editable. */
export function cuerpoAHtml(cuerpo: string): string {
  const bloques = cuerpo.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const html = bloques
    .map((bloque) => {
      if (bloque.startsWith("### ")) return `<h3>${escapeHtml(bloque.slice(4))}</h3>`;
      if (bloque.startsWith("## ")) return `<h2>${escapeHtml(bloque.slice(3))}</h2>`;

      const img = bloque.match(IMG_BLOCK_RE);
      if (img) return `<p><img src="${escapeHtml(img[1])}" alt=""></p>`;

      const lineas = bloque.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lineas.length > 0 && lineas.every((l) => l.startsWith("- "))) {
        return `<ul>${lineas.map((l) => `<li>${escapeHtml(l.slice(2))}</li>`).join("")}</ul>`;
      }
      return `<p>${escapeHtml(bloque)}</p>`;
    })
    .join("");
  return html || `<p>${escapeHtml(cuerpo)}</p>`;
}

/** HTML del editor → texto plano del cuerpo. */
export function htmlACuerpo(root: HTMLElement): string {
  const bloques: string[] = [];

  /** Recorre un párrafo/div: el texto va a un bloque y cada <img> a su propio bloque, en orden. */
  const procesarInline = (el: Element) => {
    let buffer = "";
    const vaciar = () => {
      const texto = buffer.trim();
      if (texto) bloques.push(texto);
      buffer = "";
    };
    el.childNodes.forEach((nodo) => {
      if (nodo.nodeType === Node.ELEMENT_NODE) {
        const hijo = nodo as Element;
        if (hijo.tagName === "IMG") {
          vaciar();
          const src = hijo.getAttribute("src");
          if (src) bloques.push(`![](${src})`);
          return;
        }
        if (hijo.querySelector("img")) {
          vaciar();
          procesarInline(hijo);
          return;
        }
      }
      buffer += nodo.textContent ?? "";
    });
    vaciar();
  };

  Array.from(root.children).forEach((nodo) => {
    const tag = nodo.tagName.toLowerCase();
    const texto = (nodo.textContent || "").trim();

    if (tag === "h2") {
      if (texto) bloques.push(`## ${texto}`);
    } else if (tag === "h3") {
      if (texto) bloques.push(`### ${texto}`);
    } else if (tag === "ul" || tag === "ol") {
      const items = Array.from(nodo.children)
        .map((li) => (li.textContent || "").trim())
        .filter(Boolean);
      if (items.length > 0) bloques.push(items.map((i) => `- ${i}`).join("\n"));
    } else if (tag === "img") {
      const src = nodo.getAttribute("src");
      if (src) bloques.push(`![](${src})`);
    } else {
      procesarInline(nodo);
    }
  });

  return bloques.join("\n\n").trim();
}
