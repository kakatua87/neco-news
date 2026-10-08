/**
 * Detección de archivos huérfanos en Supabase Storage (subidos y nunca usados, o que dejaron de usarse).
 * Funciones puras, sin red: la ruta /api/storage/limpiar arma las entradas y ejecuta el borrado.
 */

export type ArchivoStorage = { bucket: string; nombre: string; creadoEn: string | null; bytes: number };

export type Regla = {
  bucket: string;
  /** Carpeta dentro del bucket, con barra final ("noticias/"). */
  prefijo: string;
  /** Antigüedad mínima para considerarlo (los recién subidos pueden estar por usarse). */
  minDias: number;
  /** false = no se mira si está referenciado (archivos transitorios: tarjetas de Instagram ya publicadas). */
  revisarReferencias: boolean;
};

export const REGLAS: Regla[] = [
  { bucket: "noticias-imagenes", prefijo: "noticias/", minDias: 7, revisarReferencias: true },
  { bucket: "noticias-imagenes", prefijo: "banners/", minDias: 7, revisarReferencias: true },
  { bucket: "noticias-imagenes", prefijo: "redaccion/", minDias: 7, revisarReferencias: true },
  // Las tarjetas se suben para que Instagram las descargue al publicar; después no las usa nadie.
  { bucket: "noticias-imagenes", prefijo: "instagram-cards/", minDias: 7, revisarReferencias: false },
  { bucket: "tips-ciudadanos", prefijo: "envios/", minDias: 30, revisarReferencias: true },
];

export type Huerfano = ArchivoStorage & { regla: Regla };

const MS_DIA = 86_400_000;

/**
 * La ruta ("noticias/abc.jpg") aparece dentro de las URLs públicas de Storage. Es un criterio conservador: ante
 * la duda (por ejemplo una URL con parámetros, "noticias/abc.jpg?v=2") el archivo se considera en uso y se conserva.
 */
function estaReferenciado(a: ArchivoStorage, referencias: string): boolean {
  return referencias.includes(a.nombre);
}

export function encontrarHuerfanos(
  archivos: ArchivoStorage[],
  referencias: string,
  ahora: Date = new Date(),
  reglas: Regla[] = REGLAS
): Huerfano[] {
  const resultado: Huerfano[] = [];
  for (const a of archivos) {
    const regla = reglas.find((r) => r.bucket === a.bucket && a.nombre.startsWith(r.prefijo));
    if (!regla) continue; // carpeta que esta limpieza no conoce: no se toca
    if (!a.creadoEn) continue; // sin fecha no se sabe si es viejo: no se toca
    const edadDias = (ahora.getTime() - new Date(a.creadoEn).getTime()) / MS_DIA;
    if (!(edadDias >= regla.minDias)) continue;
    if (regla.revisarReferencias && estaReferenciado(a, referencias)) continue;
    resultado.push({ ...a, regla });
  }
  return resultado;
}

export type ResumenCarpeta = { bucket: string; prefijo: string; archivos: number; huerfanos: number; bytes: number };

export function resumirPorCarpeta(archivos: ArchivoStorage[], huerfanos: Huerfano[], reglas: Regla[] = REGLAS): ResumenCarpeta[] {
  return reglas.map((r) => {
    const total = archivos.filter((a) => a.bucket === r.bucket && a.nombre.startsWith(r.prefijo)).length;
    const h = huerfanos.filter((x) => x.regla === r);
    return { bucket: r.bucket, prefijo: r.prefijo, archivos: total, huerfanos: h.length, bytes: h.reduce((s, x) => s + x.bytes, 0) };
  });
}

/** Parte una lista en tandas (Storage.remove acepta lotes). */
export function enTandas<T>(items: T[], tamano: number): T[][] {
  const tandas: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) tandas.push(items.slice(i, i + tamano));
  return tandas;
}
