import { cache } from "react";
import { redirect } from "next/navigation";
import { esAdmin, getUsuarioActual } from "@/lib/auth";

/** Usuario logueado (validado contra Supabase Auth) o null. Cacheado por request. */
export const getUsuario = getUsuarioActual;

export const getEsAdmin = cache(async () => esAdmin());

/**
 * Defensa en profundidad para cada página del panel. El layout ya filtra en la
 * carga completa, pero en navegación del lado del cliente no se vuelve a ejecutar.
 */
export async function requireAdmin() {
  const user = await getUsuario();
  if (!user || !(await getEsAdmin())) redirect("/admin");
  return user;
}
