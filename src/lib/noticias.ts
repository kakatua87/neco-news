import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Noticia } from "@/types/noticia";

/** Noticias publicadas ordenadas por fecha, más recientes primero. */
export async function getPublicadas(limit = 30): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .order("fecha_publicacion", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener publicadas:", error.message);
    return [];
  }
  return data as Noticia[];
}

/** Devuelve la noticia marcada como portada del día actual, o null si no hay. */
export async function getPortadaDelDia(): Promise<Noticia | null> {
  const supabase = await createSupabaseServerClient();
  const hoy = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .eq("es_portada", true)
    .gte("fecha_publicacion", `${hoy}T00:00:00Z`)
    .lte("fecha_publicacion", `${hoy}T23:59:59Z`)
    .order("fecha_publicacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Noticia) ?? null;
}

/** Noticias pendientes de revisión editorial. */
export async function getPendientes(limit = 50): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "pendiente")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error al obtener pendientes:", error.message);
    return [];
  }
  return data as Noticia[];
}

/** Noticia individual por slug. */
export async function getNoticiaBySlug(slug: string): Promise<Noticia | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Error al obtener noticia por slug:", error?.message);
    return null;
  }
  return data as Noticia;
}

/** Noticias publicadas de un día específico (para el archivo). */
export async function getNoticiasByFecha(
  anio: number,
  mes: number,
  dia: number
): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  const fecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .gte("fecha_publicacion", `${fecha}T00:00:00Z`)
    .lte("fecha_publicacion", `${fecha}T23:59:59Z`)
    .order("fecha_publicacion", { ascending: false });

  if (error) {
    console.error("Error al obtener noticias por fecha:", error.message);
    return [];
  }
  return data as Noticia[];
}

/** Conteo de noticias publicadas por día de un mes (para el calendario del archivo). */
export async function getNoticiasCountByMonth(
  anio: number,
  mes: number
): Promise<Record<number, number>> {
  const supabase = await createSupabaseServerClient();
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
