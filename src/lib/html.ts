/** Escapa texto para insertarlo como contenido o atributo HTML. */
export function escapeHtml(valor: unknown): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Devuelve la URL solo si es http(s); si no, null (evita javascript:, data:, etc.). */
export function urlHttpSegura(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  try {
    const u = new URL(valor.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Valida los campos de un banner. Devuelve un mensaje de error o null si todo está bien. */
export function validarCamposBanner(campos: {
  imagen_url?: unknown;
  url_destino?: unknown;
  fecha_inicio?: unknown;
  fecha_fin?: unknown;
}): string | null {
  const { imagen_url, url_destino, fecha_inicio, fecha_fin } = campos;
  if (typeof imagen_url === "string" && imagen_url.trim() && !urlHttpSegura(imagen_url)) {
    return "La imagen debe ser una URL http(s) válida";
  }
  if (typeof url_destino === "string" && url_destino.trim() && !urlHttpSegura(url_destino)) {
    return "El enlace de destino debe empezar con http:// o https://";
  }
  for (const f of [fecha_inicio, fecha_fin]) {
    if (f && (typeof f !== "string" || Number.isNaN(new Date(f).getTime()))) {
      return "Fecha inválida";
    }
  }
  if (fecha_inicio && fecha_fin && new Date(String(fecha_inicio)) > new Date(String(fecha_fin))) {
    return "La fecha de inicio no puede ser posterior a la de fin";
  }
  return null;
}
