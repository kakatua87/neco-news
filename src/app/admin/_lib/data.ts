import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SECCIONES } from "@/lib/secciones";
import type { Editable } from "./types";
import { ESTADOS_ACTIVOS, type Envio } from "./envios";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizarScraperConfig, type ScraperConfig } from "./scraperConfig";

export type Stats = { publicadas: number; pendientes: number; descartadas: number };

export const getStats = cache(async (): Promise<Stats> => {
  const supabase = await createSupabaseServerClient();
  const contar = (estado: string) =>
    supabase.from("noticias").select("id", { count: "exact", head: true }).eq("estado", estado);
  const [pub, pen, des] = await Promise.all([contar("publicada"), contar("pendiente"), contar("descartada")]);
  return {
    publicadas: pub.count ?? 0,
    pendientes: pen.count ?? 0,
    descartadas: des.count ?? 0,
  };
});

/** Cantidad de grupos en la bandeja (mismo criterio y límite de filas que getRawGrupos). */
export const getInboxCount = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("noticias")
    .select("id, grupo_id, prioridad")
    .eq("estado", "raw")
    .order("created_at", { ascending: false })
    .limit(150);
  // Los grupos descartables (farándula, archivo, notas comerciales) quedan ocultos en la Bandeja y no cuentan.
  const clave = (n: { id: unknown; grupo_id: string | null }) => n.grupo_id || `sin-grupo-${n.id}`;
  const visibles = new Set((data ?? []).filter((n) => n.prioridad !== 3).map(clave));
  return visibles.size;
});

/**
 * Secciones en uso: recorre la columna `seccion` de toda la tabla, así que es la consulta más
 * pesada del panel y la pedían casi todas las pestañas en cada navegación. Cambia muy de vez en
 * cuando, por eso se cachea entre requests (2 minutos). Usa el cliente admin porque dentro de un
 * caché no se puede leer la sesión (cookies); la lista de secciones no es información sensible.
 */
const leerSeccionesUsadas = unstable_cache(
  async (): Promise<string[]> => {
    const { data } = await createSupabaseAdminClient().from("noticias").select("seccion");
    return Array.from(new Set((data ?? []).map((n) => n.seccion).filter(Boolean))) as string[];
  },
  ["admin-secciones-usadas"],
  { revalidate: 120, tags: ["secciones"] },
);

/**
 * `disponibles`: las secciones oficiales del portal (las del menú), únicas que ofrecen los selectores del admin.
 * `usadas`: las que hay en la base (incluye restos de secciones viejas); solo para revisar y renombrar en Configuración.
 */
export const getSecciones = cache(async (): Promise<{ disponibles: string[]; usadas: string[] }> => {
  const usadas = await leerSeccionesUsadas();
  return { disponibles: [...SECCIONES], usadas };
});

const COLUMNAS_PUBLICADAS = "id, titulo, cuerpo, seccion, imagen_url, fecha_publicacion, slug, es_portada, orden_portada";

/** Últimas publicadas para el panel (mismo límite que tenía /api/noticias/publicadas). */
export const getPublicadasAdmin = cache(async (limit = 100) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(COLUMNAS_PUBLICADAS)
    .eq("estado", "publicada")
    .order("fecha_publicacion", { ascending: false })
    .limit(limit);
  if (error) console.error("Error al obtener publicadas (admin):", error.message);
  return (data ?? []) as unknown as Editable[];
});

/** Avisos fúnebres publicados: consulta propia para que no compitan por el límite con las noticias. */
export const getObituariosAdmin = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(COLUMNAS_PUBLICADAS)
    .eq("estado", "publicada")
    .eq("seccion", "Obituarios")
    .order("fecha_publicacion", { ascending: false })
    .limit(200);
  if (error) console.error("Error al obtener obituarios (admin):", error.message);
  return (data ?? []) as unknown as Editable[];
});

/** Config del scraper leída con el cliente admin (la página ya pasó por requireAdmin). */
export const getScraperConfig = cache(async (): Promise<ScraperConfig> => {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("scraper_config").select("*").eq("id", 1).single();
  return normalizarScraperConfig(data);
});

export type SaludFuente = {
  fuente: string;
  ultimaCorrida: string;
  tarjetas: number;
  nuevas: number;
  bloqueadas: number;
  guardadas7d: number;
  ultimaNota: string | null;
  error: string | null;
  estado: "ok" | "atencion" | "caida";
};

/** Estado de cada fuente según las corridas del scraper (tabla `fuentes_salud`, solo service role). */
export const getSaludFuentes = cache(async (): Promise<SaludFuente[]> => {
  const desde = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await createSupabaseAdminClient()
    .from("fuentes_salud")
    .select("fuente, ts, tarjetas, nuevas, guardadas, bloqueadas, error")
    .gte("ts", desde)
    .order("ts", { ascending: false })
    .limit(1500);
  const porFuente = new Map<string, NonNullable<typeof data>>();
  for (const f of data ?? []) porFuente.set(f.fuente, [...(porFuente.get(f.fuente) ?? []), f]);
  const hace30h = Date.now() - 30 * 3600 * 1000;
  return Array.from(porFuente.entries()).map(([fuente, filas]) => {
    const ultima = filas[0];
    const real = filas.find((f) => !f.error) ?? ultima; // las filas con error son pausas o fallos de la corrida
    const conNotas = filas.find((f) => (f.guardadas ?? 0) > 0);
    const sinNotas30h = !conNotas || new Date(conNotas.ts).getTime() < hace30h;
    const bloqueada = (real.bloqueadas ?? 0) >= 2 && (real.guardadas ?? 0) === 0;
    const estado = bloqueada || sinNotas30h ? "caida" : ultima.error || (real.tarjetas ?? 0) === 0 ? "atencion" : "ok";
    return {
      fuente,
      ultimaCorrida: ultima.ts,
      tarjetas: real.tarjetas ?? 0,
      nuevas: real.nuevas ?? 0,
      bloqueadas: real.bloqueadas ?? 0,
      guardadas7d: filas.reduce((s, f) => s + (f.guardadas ?? 0), 0),
      ultimaNota: conNotas?.ts ?? null,
      error: ultima.error,
      estado,
    } satisfies SaludFuente;
  });
});

export type Descartada = {
  id: string | number;
  titulo: string;
  seccion: string;
  fuente: string | null;
  created_at: string;
  url_original: string | null;
};

/** Últimas descartadas (más recientes primero) para poder revisarlas o restaurarlas. */
export const getDescartadasAdmin = cache(async (limit = 100): Promise<Descartada[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("id, titulo, seccion, fuente, created_at, url_original")
    .eq("estado", "descartada")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("Error al obtener descartadas (admin):", error.message);
  return (data ?? []) as Descartada[];
});

export type Actividad = {
  scraperActivo: boolean;
  scraperDesde: string | null;
  ultimoIngreso: string | null;
  ultimaPublicacion: string | null;
  enviosNuevos: number;
};

/** Datos reales para el dashboard (reemplaza el bloque de "Estado del Motor IA", que era texto fijo). */
export const getActividad = cache(async (): Promise<Actividad> => {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const [config, ingreso, publicacion, envios] = await Promise.all([
    getScraperConfig(),
    supabase.from("noticias").select("created_at").order("created_at", { ascending: false }).limit(1),
    supabase
      .from("noticias")
      .select("fecha_publicacion")
      .eq("estado", "publicada")
      .order("fecha_publicacion", { ascending: false })
      .limit(1),
    admin.from("envios_ciudadanos").select("id", { count: "exact", head: true }).eq("estado", "nuevo"),
  ]);
  return {
    scraperActivo: config.activo,
    scraperDesde: config.fecha_inicio,
    ultimoIngreso: ingreso.data?.[0]?.created_at ?? null,
    ultimaPublicacion: publicacion.data?.[0]?.fecha_publicacion ?? null,
    enviosNuevos: envios.count ?? 0,
  };
});

/** Cantidad de notas crudas en la bandeja (para avisar cuando la lista está truncada). */
export const getRawCount = cache(async (): Promise<number> => {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("noticias").select("id", { count: "exact", head: true }).eq("estado", "raw");
  return count ?? 0;
});

/** Envíos ciudadanos recientes (activos e historial). La página ya pasó por requireAdmin. */
export const getEnviosAdmin = cache(async (limit = 200): Promise<Envio[]> => {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("envios_ciudadanos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("Error al obtener envíos (admin):", error.message);
  return (data ?? []) as Envio[];
});

/** Envíos que todavía esperan trabajo (nuevos o en revisión). */
export const getEnviosActivosCount = cache(async (): Promise<number> => {
  const admin = createSupabaseAdminClient();
  const { count } = await admin
    .from("envios_ciudadanos")
    .select("id", { count: "exact", head: true })
    .in("estado", ESTADOS_ACTIVOS);
  return count ?? 0;
});
