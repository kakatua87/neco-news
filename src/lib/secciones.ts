/** Secciones base del portal. Las secciones en uso se suman desde la base (ver admin/_lib/data.ts). */
export const SECCIONES = [
  "Política", "Economía", "Policiales", "Local",
  "Deportes", "Sociedad", "Salud", "Cultura",
  "Tecnología", "Educación",
];

/**
 * Farmacias y Obituarios son contenido de servicio (se auto-publican todos los
 * días): no se mezclan con las noticias reales en el filtro "Todas".
 */
export const SECCIONES_SOLO_FILTRO_DIRECTO = ["Farmacias", "Obituarios"];

/** "Política Local" → "politica-local". Misma regla que usa el portal en las URLs. */
export function seccionSlug(seccion: string): string {
  return (seccion || "local")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/\s+/g, "-");
}

export function unirSecciones(...listas: Array<string[] | undefined>): string[] {
  return Array.from(new Set(listas.flatMap((l) => l ?? []).filter(Boolean)));
}
