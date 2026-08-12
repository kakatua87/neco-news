import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * true si la sesión activa (cookie del navegador) pertenece a un admin real
 * (tabla public.admins), no solo a "cualquiera que esté logueado". El
 * self-signup de Supabase Auth está habilitado, así que cualquiera puede
 * crearse una cuenta — esto es lo único que evita que use las rutas de
 * administración una vez logueado.
 */
export async function esAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

/**
 * Verifica el secreto compartido para llamadas server-to-server (Vercel Cron,
 * el scraper de Python, u otra ruta del propio backend) que no tienen cookie
 * de sesión de usuario. Se manda como `Authorization: Bearer <secreto>`.
 */
export function tieneSecretoInterno(request: Request, envVar = "INTERNAL_API_SECRET"): boolean {
  const secreto = process.env[envVar];
  if (!secreto) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secreto}`;
}
