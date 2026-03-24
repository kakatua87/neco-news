import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Noticia } from "@/types/noticia";

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
