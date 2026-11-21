import { createSupabasePublicClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { Noticia, NoticiaLista, NoticiaPublica } from "@/types/noticia";
import { SELECT_LISTA, SELECT_PUBLICO, soloImagenPropia } from "@/types/noticia";
import { rangoDiaArgentina } from "@/lib/fechas";
import { escaparLike } from "@/lib/validar";

/**
 * Error de lectura de la base en una página CACHEADA (ISR: portada, secciones, notas, obituarios). Se LANZA en vez de
 * devolver una lista vacía: si la regeneración lanza un error, Next.js sigue mostrando la última página buena y lo
 * reintenta en la visita siguiente. Si en cambio devolviéramos [] / null, la regeneración "tendría éxito" con una
 * portada vacía (con las notas de ejemplo) o una nota que da 404, y esa página rota quedaría cacheada varios minutos.
 * La base gratis de Supabase se congela por momentos (timeouts), así que esto pasa de verdad.
 */
export function falloLectura(contexto: string, error: { message?: string } | null | undefined): never {
  console.error(`${contexto}:`, error?.message);
  throw new Error(`${contexto}: ${error?.message ?? "sin datos"}`);
}

/** Noticias publicadas ordenadas por fecha, más recientes primero. Excluye Obituarios. */
export async function getPublicadas(limit = 30): Promise<NoticiaLista[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_LISTA)
    .eq("estado", "publicada")
    .neq("seccion", "Obituarios")
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) falloLectura("Error al obtener publicadas", error);
  return (data as unknown as NoticiaLista[]).map(soloImagenPropia);
}

/**
 * Texto completo (`cuerpo`) de unas pocas notas, por id. La portada lo usa solo como respaldo del resumen
 * de las notas del sidebar que no tienen `resumen_seo`; si todas lo tienen, no se llama.
 */
export async function getCuerposPorId(ids: string[]): Promise<Map<string, string>> {
  const cuerpos = new Map<string, string>();
  if (ids.length === 0) return cuerpos;
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.from("noticias").select("id, cuerpo").in("id", ids);
  if (error) {
    console.error("Error al obtener cuerpos:", error.message);
    return cuerpos;
  }
  for (const fila of data ?? []) cuerpos.set(fila.id as string, fila.cuerpo as string);
  return cuerpos;
}

/**
 * Noticias incluidas en el carrusel de portada, ordenadas por orden_portada (hasta 9).
 * Cada lote de notas publicadas (edición automática, botón "Publicar con IA", rutina de revisión) suma sus 3
 * más relevantes con la función SQL `agregar_a_carrusel`; las de lotes anteriores del día se corren hacia atrás.
 * Si hoy todavía no hubo ningún lote, un trigger arma un respaldo con lo más reciente de cada sección.
 * Acá además filtramos por "hoy" (huso horario Argentina) para no mostrar nunca una portada de un día anterior.
 */
export async function getCarruselPortada(): Promise<NoticiaLista[]> {
  const supabase = createSupabasePublicClient();
  const { inicio, fin } = rangoDiaArgentina();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_LISTA)
    .eq("estado", "publicada")
    .eq("es_portada", true)
    .neq("seccion", "Obituarios")
    .gte("fecha_publicacion", inicio)
    .lte("fecha_publicacion", fin)
    .order("orden_portada", { ascending: true, nullsFirst: false })
    .limit(9);

  if (error || !data) falloLectura("Error al obtener carrusel de portada", error);
  return (data as unknown as NoticiaLista[]).map(soloImagenPropia);
}

/** Noticias publicadas de una sección específica, más recientes primero. */
export async function getPublicadasPorSeccion(seccion: string, limit = 3): Promise<NoticiaLista[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_LISTA)
    .eq("estado", "publicada")
    .ilike("seccion", seccion)
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) falloLectura(`Error al obtener publicadas de ${seccion}`, error);
  return (data as unknown as NoticiaLista[]).map(soloImagenPropia);
}

/** Devuelve la noticia marcada como portada del día actual, o null si no hay. */
export async function getPortadaDelDia(): Promise<NoticiaPublica | null> {
  const supabase = createSupabasePublicClient();
  const { inicio, fin } = rangoDiaArgentina();
  const { data } = await supabase
    .from("noticias")
    .select(SELECT_PUBLICO)
    .eq("estado", "publicada")
    .eq("es_portada", true)
    .gte("fecha_publicacion", inicio)
    .lte("fecha_publicacion", fin)
    .order("fecha_publicacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? soloImagenPropia(data as unknown as NoticiaPublica) : null;
}

/** Noticias pendientes de revisión editorial. */
export async function getPendientes(limit = 50): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  // Solo las columnas que usa el panel: `select *` traía también guion de video, textos de redes, etc.
  const { data, error } = await supabase
    .from("noticias")
    .select("id, titulo, cuerpo, seccion, estado, imagen_url, created_at, url_original, fuentes_urls, origen, auto_motivo, imagenes_fuentes")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener pendientes:", error.message);
    return [];
  }
  return data as Noticia[];
}

/**
 * Busca noticias publicadas cuyo título o resumen contengan el término dado.
 * Son dos consultas `.ilike()` (el valor viaja como parámetro y no como sintaxis de filtro): con un
 * `.or()` armado a mano, una coma o un paréntesis del usuario rompía la consulta o inyectaba condiciones.
 */
export async function getBusqueda(query: string, limit = 30): Promise<NoticiaPublica[]> {
  const supabase = createSupabasePublicClient();
  const term = query.trim().slice(0, 100);
  if (!term) return [];
  const patron = `%${escaparLike(term)}%`;

  const buscarEn = (columna: "titulo" | "resumen_seo") =>
    supabase
      .from("noticias")
      .select(SELECT_PUBLICO)
      .eq("estado", "publicada")
      .ilike(columna, patron)
      .order("fecha_publicacion", { ascending: false, nullsFirst: false })
      .limit(limit);

  const [porTitulo, porResumen] = await Promise.all([buscarEn("titulo"), buscarEn("resumen_seo")]);
  if (porTitulo.error || porResumen.error) {
    console.error("Error al buscar noticias:", porTitulo.error?.message ?? porResumen.error?.message);
    if (porTitulo.error && porResumen.error) return [];
  }

  const unicas = new Map<string | number, NoticiaPublica>();
  for (const n of [...(porTitulo.data ?? []), ...(porResumen.data ?? [])] as unknown as NoticiaPublica[]) unicas.set(n.id, soloImagenPropia(n));
  return Array.from(unicas.values())
    .sort((a, b) => (b.fecha_publicacion ?? "").localeCompare(a.fecha_publicacion ?? ""))
    .slice(0, limit);
}

/**
 * Noticia individual por slug. Usa el cliente público sin cookies (la política RLS de `anon` solo expone las
 * publicadas), así la página puede cachearse y no consulta el auth en cada visita. `cache()` evita repetir la
 * consulta entre `generateMetadata` y la página dentro del mismo render. Un slug inexistente es un caso
 * normal (404), no un error: `maybeSingle()` devuelve null sin loguear.
 */
export const getNoticiaBySlug = cache(async (slug: string): Promise<NoticiaPublica | null> => {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_PUBLICO)
    .eq("slug", slug)
    .maybeSingle();

  // Un error de la base NO es "la nota no existe": se lanza (si no, una nota real daría 404 cacheado por 10 minutos).
  if (error) falloLectura("Error al obtener noticia por slug", error);
  return data ? soloImagenPropia(data as unknown as NoticiaPublica) : null;
});

/** Noticias publicadas de un día específico (para el archivo). */
export async function getNoticiasByFecha(
  anio: number,
  mes: number,
  dia: number
): Promise<NoticiaPublica[]> {
  const supabase = createSupabasePublicClient();
  const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_PUBLICO)
    .eq("estado", "publicada")
    .gte("fecha_publicacion", `${fecha}T00:00:00Z`)
    .lte("fecha_publicacion", `${fecha}T23:59:59Z`)
    .order("fecha_publicacion", { ascending: false });

  if (error) {
    console.error("Error al obtener noticias por fecha:", error.message);
    return [];
  }
  return (data as unknown as NoticiaPublica[]).map(soloImagenPropia);
}

/** Conteo de noticias publicadas por día de un mes (para el calendario del archivo). */
export async function getNoticiasCountByMonth(
  anio: number,
  mes: number
): Promise<Record<number, number>> {
  const supabase = createSupabasePublicClient();
  const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01T00:00:00Z`;
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const ultimoStr = `${anio}-${String(mes).padStart(2, "0")}-${diasEnMes}T23:59:59Z`;

  const { data, error } = await supabase
    .from("noticias")
    .select("fecha_publicacion")
    .eq("estado", "publicada")
    .gte("fecha_publicacion", primerDia)
    .lte("fecha_publicacion", ultimoStr);

  if (error || !data) return {};

  const counts: Record<number, number> = {};
  for (const row of data) {
    if (!row.fecha_publicacion) continue;
    const day = new Date(row.fecha_publicacion).getDate();
    counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

/** Noticias publicadas con su kit de Instagram (título gancho, caption, imagen, link). */
export async function getInstagramKit(limit = 60): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(
      "id, titulo, instagram_titulo, instagram_text, imagen_url, imagen_fuente, slug, seccion, fecha_publicacion, instagram_publicado_at, instagram_permalink, facebook_publicado_at, facebook_permalink, x_publicado_at, x_permalink"
    )
    .eq("estado", "publicada")
    .eq("instagram_descartado", false)
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener instagram kit:", error.message);
    return [];
  }
  return data as Noticia[];
}

/** Obtiene grupos de noticias en estado 'raw' ordenados por fecha. */
export async function getRawGrupos(limit = 100): Promise<Record<string, Noticia[]>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "raw")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Error al obtener raw grupos:", error?.message);
    return {};
  }

  // Agrupar por grupo_id
  const groups: Record<string, Noticia[]> = {};
  for (const item of (data as Noticia[])) {
    const gid = item.grupo_id || `sin-grupo-${item.id}`;
    if (!groups[gid]) groups[gid] = [];
    groups[gid].push(item);
  }

  return groups;
}
