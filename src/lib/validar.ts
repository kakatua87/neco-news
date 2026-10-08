/** Validaciones chicas y sin dependencias para los cuerpos de las rutas /api. */

export const esTextoHasta = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

export const esId = (v: unknown): v is string | number =>
  (typeof v === "string" && v.length > 0 && v.length <= 64) || (typeof v === "number" && Number.isFinite(v));

/** Lista de ids no vacía y acotada (evita borrados masivos con payloads gigantes o mal formados). */
export function esListaIds(v: unknown, max = 500): v is Array<string | number> {
  return Array.isArray(v) && v.length > 0 && v.length <= max && v.every(esId);
}

export type ArchivoEnvio = { url: string; tipo: string; nombre: string };

/**
 * Archivos de un envío ciudadano: solo se aceptan los que subió nuestra propia ruta
 * (bucket público de Storage), con forma {url, tipo, nombre}. Devuelve null si algo no cierra.
 */
export function validarArchivosEnvio(v: unknown, max = 10): ArchivoEnvio[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prefijo = base ? `${base}/storage/v1/object/public/tips-ciudadanos/` : null;

  const limpios: ArchivoEnvio[] = [];
  for (const a of v) {
    if (!a || typeof a !== "object") return null;
    const { url, tipo, nombre } = a as Record<string, unknown>;
    if (typeof url !== "string" || !prefijo || !url.startsWith(prefijo) || url.length > 500) return null;
    if (!esTextoHasta(tipo, 100) || !esTextoHasta(nombre, 200)) return null;
    limpios.push({ url, tipo, nombre });
  }
  return limpios;
}

/** Escapa `\`, `%` y `_` para usar un texto del usuario dentro de un patrón LIKE/ILIKE como literal. */
export const escaparLike = (texto: string): string => texto.replace(/[\\%_]/g, (c) => "\\" + c);
