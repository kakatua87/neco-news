import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const FACEBOOK_GRAPH_VERSION = "v21.0";
export const FACEBOOK_GRAPH_HOST = "https://graph.facebook.com";

export type CredencialesFacebook = {
  /** Token de la Página (sale de un token de usuario de larga duración, por lo que no vence). */
  token: string;
  pageId: string;
  pageName: string | null;
};

/** Credenciales de la Página de Facebook guardadas en la base. null si todavía no se conectó (o falta la tabla). */
export async function obtenerCredencialesFacebook(): Promise<CredencialesFacebook | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("facebook_credenciales")
      .select("access_token, page_id, page_name")
      .eq("id", 1)
      .maybeSingle();
    if (data?.access_token && data.page_id) {
      return { token: data.access_token, pageId: data.page_id, pageName: data.page_name };
    }
  } catch (err) {
    console.error("facebook-credenciales: no se pudo leer la base:", err);
  }
  return null;
}

/** Guarda (o reemplaza) la Página conectada. Devuelve false si no se pudo (p. ej. falta la tabla). */
export async function guardarCredencialesFacebook(token: string, pageId: string, pageName: string | null): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("facebook_credenciales").upsert({
      id: 1,
      access_token: token,
      page_id: pageId,
      page_name: pageName,
      actualizado_en: new Date().toISOString(),
    });
    if (error) {
      console.error("facebook-credenciales: no se pudo guardar:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("facebook-credenciales: error inesperado al guardar:", err);
    return false;
  }
}

/** Origen del sitio, igual que el de Instagram: la redirect_uri tiene que ser idéntica al autorizar y al canjear. */
export function redirectUriFacebook(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://neco-news-seven.vercel.app";
  return `${origin}/api/facebook/conectar/callback`;
}
