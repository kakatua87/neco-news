export type EstadoNoticia = "raw" | "pendiente" | "publicada" | "descartada";

export type FuenteUrl = {
  fuente: string;
  url: string;
};

/** Foto de una de las fuentes de la nota, ya copiada al bucket propio (solo panel admin). */
export type FotoFuente = { fuente: string; url: string; con_logo?: boolean };

export type Noticia = {
  id: string | number;
  titulo: string;
  cuerpo: string;
  resumen_seo: string | null;
  seccion: string;
  estado: EstadoNoticia;
  url_original: string | null;
  imagen_url: string | null;
  instagram_text: string | null;
  instagram_titulo: string | null;
  twitter_text: string | null;
  guion_video: string | null;
  slug: string;
  fecha_publicacion: string | null;
  created_at: string;
  es_portada: boolean;
  orden_portada?: number | null;
  grupo_id?: string | null;
  titulo_original?: string | null;
  fuente?: string | null;
  imagen_fuente?: string | null;
  instagram_descartado?: boolean;
  instagram_publicado_at?: string | null;
  instagram_post_id?: string | null;
  instagram_permalink?: string | null;
  facebook_publicado_at?: string | null;
  facebook_post_id?: string | null;
  facebook_permalink?: string | null;
  x_publicado_at?: string | null;
  x_post_id?: string | null;
  x_permalink?: string | null;
  fuentes_urls?: FuenteUrl[] | null;
  origen?: string;
  /** Veredicto de la edición matutina automática; no es público (fuera de COLUMNAS_PUBLICAS). */
  auto_motivo?: string | null;
  /** Fotos de cada fuente para elegir desde Pendientes; no es público (fuera de COLUMNAS_PUBLICAS). */
  imagenes_fuentes?: FotoFuente[] | null;
  /** Sección a la que iría la nota según el scraper (antes de procesarla); solo panel admin. */
  seccion_prevista?: string | null;
  /** 1 alta · 2 media · 3 descartable (farándula, archivo, nota comercial); solo panel admin. */
  prioridad?: number | null;
  motivo_descarte?: string | null;
};

/**
 * Columnas de `noticias` que el público puede leer. Es la lista blanca que usan las consultas
 * anónimas y a la vez el grant de columnas en la base (ver supabase/migraciones/2026-10-14_ocultar_origen.sql).
 * Los datos de origen (url_original, fuente, fuentes_urls, imagen_fuente, titulo_original, grupo_id,
 * ids de redes) quedan fuera a propósito: no deben viajar al navegador ni a la API pública.
 */
export const COLUMNAS_PUBLICAS = [
  "id", "titulo", "cuerpo", "resumen_seo", "seccion", "slug", "imagen_url",
  "fecha_publicacion", "created_at", "es_portada", "orden_portada", "estado",
  "instagram_text", "twitter_text",
] as const;

export type NoticiaPublica = Pick<Noticia, (typeof COLUMNAS_PUBLICAS)[number]>;

/** Para `.select()` de PostgREST. */
export const SELECT_PUBLICO = COLUMNAS_PUBLICAS.join(", ");

/**
 * Red de seguridad: el público solo ve imágenes alojadas en nuestro Storage. Una `imagen_url`
 * que apunte a otro dominio (p. ej. la foto original de una fuente si falló la subida) se
 * descarta, así el navegador del lector nunca le pide nada al sitio original.
 */
export function soloImagenPropia<T extends { imagen_url: string | null }>(nota: T): T {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const url = nota.imagen_url;
  if (!url) return nota;
  if (base && url.startsWith(`${base}/storage/v1/object/public/`)) return nota;
  if (url.startsWith("/")) return nota;
  return { ...nota, imagen_url: null };
}
