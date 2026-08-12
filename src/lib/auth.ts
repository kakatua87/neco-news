import { createSupabaseServerClient } from "@/lib/supabase/server";

/** true si hay una sesión de Supabase válida (cookie del navegador). */
export async function hayySesionValida(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && !!user;
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
