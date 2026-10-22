/**
 * Secciones oficiales del portal: las del menú. Es la ÚNICA lista: la usan el menú y el pie (Header/Footer), los
 * selectores del admin y, copiada en el scraper (clasificador_secciones.SECCIONES_VALIDAS), la IA al clasificar.
 * Si se agrega o quita una, hay que cambiarla también en el scraper.
 */
export const SECCIONES_MENU = [
  "Local", "Policiales", "Política", "Economía", "Deportes", "Zona", "Sociedad", "Opinión", "Cultura", "Tendencias",
];

/** Secciones que la IA puede elegir (Opinión es de autor: solo se carga a mano). */
export const SECCIONES_IA = SECCIONES_MENU.filter((s) => s !== "Opinión");

/** Secciones que ofrece el admin al editar una nota. */
export const SECCIONES = SECCIONES_MENU;

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
