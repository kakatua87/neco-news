import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

/** Clave con la que se guardan y buscan las secciones: minúsculas y sin espacios en los bordes. */
export const claveSeccion = (valor: string): string => valor.trim().toLowerCase();

/** decodeURIComponent que no explota con una URL mal formada. */
export function decodificarSeguro(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

/**
 * La página de una nota se busca por slug, así que una URL con una sección vieja (renombrada) igual la abre.
 * Devuelve la ruta a la que hay que redirigir (301) para no tener la misma nota con direcciones distintas,
 * o null si la URL pedida ya es una de las dos formas válidas hoy:
 *   - "/vida cotidiana/slug"  (sitemap y links del sitio)
 *   - "/vida-cotidiana/slug"  (push, newsletter, Instagram) → `formaConGuiones`
 */
export function rutaNotaCanonica(
  seccionPedida: string,
  seccionActual: string,
  formaConGuiones: string,
  slug: string
): string | null {
  const pedida = decodificarSeguro(seccionPedida).toLowerCase();
  const actual = seccionActual.toLowerCase();
  if (pedida === actual || pedida === formaConGuiones) return null;
  return `/${encodeURIComponent(actual)}/${slug}`;
}

/**
 * Registra que `anterior` pasó a llamarse `nueva` (para redirigir el listado de la sección vieja).
 * Evita cadenas: si A→B y ahora B→C, A pasa a apuntar directo a C. Nunca rompe el renombrado:
 * ante cualquier error (p. ej. falta la tabla) solo lo registra en el log.
 */
export async function registrarRedireccionSeccion(supabase: SupabaseAdmin, anterior: string, nueva: string): Promise<void> {
  const a = claveSeccion(anterior);
  const n = claveSeccion(nueva);
  if (!a || !n || a === n) return;
  try {
    await supabase.from("seccion_redirects").update({ nueva: n }).eq("nueva", a);
    await supabase.from("seccion_redirects").delete().eq("anterior", n); // se volvió a un nombre anterior
    const { error } = await supabase.from("seccion_redirects").upsert({ anterior: a, nueva: n });
    if (error) console.error("seccion-redirects: no se pudo registrar la redirección:", error.message);
  } catch (err) {
    console.error("seccion-redirects: error inesperado al registrar:", err);
  }
}
