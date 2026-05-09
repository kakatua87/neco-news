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

