import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export type ResultadoInsercion =
  | { ok: true; id: string; slug: string }
  | { ok: false; status: number; error: string };

/** "El Petróleo supera los 105 US$!" → "el-petroleo-supera-los-105-us". Máx. 80 caracteres. */
export function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const MAX_INTENTOS = 5;

/**
 * Inserta una noticia (estado 'pendiente') resolviendo la colisión del slug único: si ya existe,
 * reintenta con sufijo -2, -3… En vez de devolver el error crudo de la base devuelve un mensaje
 * que se puede mostrar en el panel.
 */
export async function insertarNoticiaPendiente(
  supabase: SupabaseAdmin,
  datos: Record<string, unknown> & { slug: string; titulo: string }
): Promise<ResultadoInsercion> {
  const base = slugificar(datos.slug) || slugificar(datos.titulo) || "nota";

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const slug = intento === 1 ? base : `${base}-${intento}`;
    const { data, error } = await supabase
      .from("noticias")
      .insert({ ...datos, slug })
      .select("id")
      .single();

    if (!error && data) return { ok: true, id: data.id as string, slug };

    const esSlugDuplicado = error?.code === "23505" && `${error.message} ${error.details ?? ""}`.includes("slug");
    if (esSlugDuplicado) continue;

    console.error("Error creando noticia pendiente:", error);
    return { ok: false, status: 500, error: "No se pudo crear la noticia. Probá de nuevo." };
  }

  return {
    ok: false,
    status: 409,
    error: "Ya existen varias noticias con un título casi igual. Cambiá el título e intentá de nuevo.",
  };
}
