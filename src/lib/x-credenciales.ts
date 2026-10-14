import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const X_API = "https://api.x.com/2";

export type CredencialesX = {
  token: string;
  refreshToken: string | null;
  expiraEn: string | null;
  userId: string | null;
  username: string | null;
};

type TokenX = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };

function cabecerasToken(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  const id = process.env.X_CLIENT_ID?.trim();
  const secret = process.env.X_CLIENT_SECRET?.trim();
  // La app de X es confidencial (web app): client_id:client_secret en Basic.
  if (id && secret) headers.Authorization = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  return headers;
}

/** Credenciales de X guardadas en la base. null si todavía no se conectó (o falta la tabla). */
export async function obtenerCredencialesX(): Promise<CredencialesX | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("x_credenciales")
      .select("access_token, refresh_token, expira_en, user_id, username")
      .eq("id", 1)
      .maybeSingle();
    if (data?.access_token) {
      return {
        token: data.access_token,
        refreshToken: data.refresh_token,
        expiraEn: data.expira_en,
        userId: data.user_id,
        username: data.username,
      };
    }
  } catch (err) {
    console.error("x-credenciales: no se pudo leer la base:", err);
  }
  return null;
}

export async function guardarCredencialesX(c: {
  token: string;
  refreshToken: string | null;
  expiresIn: number | null;
  userId: string | null;
  username: string | null;
}): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("x_credenciales").upsert({
      id: 1,
      access_token: c.token,
      refresh_token: c.refreshToken,
      expira_en: c.expiresIn ? new Date(Date.now() + c.expiresIn * 1000).toISOString() : null,
      user_id: c.userId,
      username: c.username,
      actualizado_en: new Date().toISOString(),
    });
    if (error) {
      console.error("x-credenciales: no se pudo guardar:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("x-credenciales: error inesperado al guardar:", err);
    return false;
  }
}

/** Canjea el código (con PKCE) por tokens. */
export async function canjearCodigoX(code: string, verifier: string): Promise<{ ok: boolean; data: TokenX }> {
  const res = await fetch(`${X_API}/oauth2/token`, {
    method: "POST",
    headers: cabecerasToken(),
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUriX(),
      code_verifier: verifier,
      client_id: process.env.X_CLIENT_ID?.trim() || "",
    }),
  });
  return { ok: res.ok, data: (await res.json().catch(() => ({}))) as TokenX };
}

/**
 * Devuelve un access token vigente: el de X dura 2 h, así que se refresca al usarlo si queda menos de 5 min.
 * El refresh_token rota en cada refresh: hay que guardar siempre el nuevo.
 */
export async function tokenVigenteX(): Promise<CredencialesX | null> {
  const cred = await obtenerCredencialesX();
  if (!cred) return null;
  const vence = cred.expiraEn ? new Date(cred.expiraEn).getTime() : 0;
  if (vence - Date.now() > 5 * 60 * 1000) return cred;
  if (!cred.refreshToken) return cred;

  const res = await fetch(`${X_API}/oauth2/token`, {
    method: "POST",
    headers: cabecerasToken(),
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cred.refreshToken,
      client_id: process.env.X_CLIENT_ID?.trim() || "",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as TokenX;
  if (!res.ok || !data.access_token) {
    console.error("x-credenciales: no se pudo refrescar el token", { status: res.status, error: data.error });
    return null;
  }
  const expiresIn = data.expires_in ?? 7200;
  const refreshToken = data.refresh_token ?? cred.refreshToken;
  await guardarCredencialesX({ token: data.access_token, refreshToken, expiresIn, userId: cred.userId, username: cred.username });
  return { ...cred, token: data.access_token, refreshToken, expiraEn: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

export function redirectUriX(): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://necobeat.com.ar";
  return `${origin}/api/x/conectar/callback`;
}
