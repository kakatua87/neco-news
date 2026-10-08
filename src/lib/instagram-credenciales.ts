import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Se renueva cuando faltan menos de estos días (los tokens de larga duración duran ~60 y se pueden extender). */
export const DIAS_PARA_RENOVAR = 15;
/** Por debajo de esto el panel avisa en rojo. */
export const DIAS_ALERTA = 10;

export type CredencialesInstagram = {
  token: string;
  igUserId: string;
  /** null cuando el token viene de una variable de entorno: no se conoce su vencimiento. */
  expiraEn: string | null;
  origen: "base" | "env";
};

export function diasRestantes(expiraEn: string | null, ahora: Date = new Date()): number | null {
  if (!expiraEn) return null;
  const ms = new Date(expiraEn).getTime() - ahora.getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 86_400_000);
}

/**
 * Credenciales de Instagram: primero las guardadas en la base (las que renueva solo el cron) y, si no hay,
 * las variables de entorno de siempre. Si la tabla todavía no existe, cae directo a las variables.
 */
export async function obtenerCredencialesInstagram(): Promise<CredencialesInstagram | null> {
  const envToken = process.env.INSTAGRAM_GRAPH_TOKEN;
  const envId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("instagram_credenciales")
      .select("access_token, ig_user_id, expira_en")
      .eq("id", 1)
      .maybeSingle();
    if (data?.access_token) {
      return {
        token: data.access_token,
        igUserId: data.ig_user_id || envId || "",
        expiraEn: data.expira_en,
        origen: "base",
      };
    }
  } catch (err) {
    console.error("instagram-credenciales: no se pudo leer la base (se usan las variables de entorno):", err);
  }
  if (envToken && envId) return { token: envToken, igUserId: envId, expiraEn: null, origen: "env" };
  return null;
}

/** Guarda (o reemplaza) el token y su vencimiento. Devuelve false si no se pudo (p. ej. falta la tabla). */
export async function guardarCredencialesInstagram(
  token: string,
  igUserId: string,
  expiraEnSegundos: number
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const expiraEn = expiraEnSegundos > 0 ? new Date(Date.now() + expiraEnSegundos * 1000).toISOString() : null;
    const { error } = await supabase.from("instagram_credenciales").upsert({
      id: 1,
      access_token: token,
      ig_user_id: igUserId || null,
      expira_en: expiraEn,
      actualizado_en: new Date().toISOString(),
    });
    if (error) {
      console.error("instagram-credenciales: no se pudo guardar:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("instagram-credenciales: error inesperado al guardar:", err);
    return false;
  }
}
