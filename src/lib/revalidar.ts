import { revalidatePath } from "next/cache";

/**
 * Invalida la portada, las secciones y las notas cacheadas (ISR) para que un cambio hecho desde el panel
 * (editar, despublicar, eliminar, cambiar de sección o de portada) se vea enseguida. Las páginas se regeneran
 * solas cada varios minutos; esto evita esa espera cuando el cambio importa, y permite mantener tiempos de
 * caché largos (menos invocaciones y menos transferencia en Vercel).
 */
export function revalidarPortal(): void {
  try {
    revalidatePath("/", "layout");
  } catch (e) {
    console.error("No se pudo revalidar el caché:", e);
  }
}
