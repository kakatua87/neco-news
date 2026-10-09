import { createSupabasePublicClient } from "@/lib/supabase/server";
import { claveSeccion } from "@/lib/seccion-url";

/**
 * Si la sección pedida se renombró, devuelve la ruta nueva ("/deportes-locales"); si no, null.
 * `pedida` puede venir con guiones ("vida-cotidiana") o con espacios, como la usa la página de sección.
 * Si la tabla todavía no existe, devuelve null (la página muestra el listado vacío como siempre).
 */
export async function buscarRedireccionSeccion(pedida: string): Promise<string | null> {
  const claves = Array.from(new Set([claveSeccion(pedida), claveSeccion(pedida).replaceAll("-", " ")]));
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.from("seccion_redirects").select("nueva").in("anterior", claves).limit(1).maybeSingle();
    return data?.nueva ? `/${encodeURIComponent(data.nueva)}` : null;
  } catch {
    return null;
  }
}
