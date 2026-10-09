import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // setAll can fail when called from a Server Component (read-only context).
          // Wrapping in try/catch is the recommended pattern from @supabase/ssr docs.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Intentionally ignored: cookie writes are only possible in
            // Server Actions or Route Handlers, not in Server Components.
          }
        },
      },
    },
  );
}


/**
 * Cliente anónimo SIN cookies para lecturas públicas (portada, secciones, archivo, sitemap).
 * Las políticas RLS ya exponen a `anon` solo las noticias publicadas, así que no hace falta la
 * sesión. Con el cliente de cookies, cada consulta intenta refrescar el token si la sesión de un
 * admin está vencida; varias consultas en paralelo en el mismo render disparan 409
 * "Too many concurrent token refresh requests". Este cliente nunca lee ni refresca sesiones.
 */
export function createSupabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
