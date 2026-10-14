import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { esAdmin } from "@/lib/auth";
import { escapeHtml } from "@/lib/html";
import { paginaOauth } from "@/lib/pagina-oauth";
import { X_API, canjearCodigoX, guardarCredencialesX } from "@/lib/x-credenciales";

export async function GET(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  if (errorParam) {
    return paginaOauth("❌ X rechazó la conexión", `<p>${escapeHtml(errorParam)}</p>`, false);
  }
  const code = searchParams.get("code");
  if (!code) {
    return paginaOauth("❌ Falta el código", `<p>No llegó el parámetro "code" en la respuesta de X.</p>`, false);
  }

  const jar = await cookies();
  const estadoGuardado = jar.get("x_oauth_state")?.value;
  const verifier = jar.get("x_oauth_verifier")?.value;
  if (!estadoGuardado || !verifier || estadoGuardado !== searchParams.get("state")) {
    return paginaOauth(
      "❌ La sesión de conexión no coincide",
      `<p>Volvé a <a href="/admin/configuracion">Configuración</a> y tocá "Conectar X" de nuevo, sin recargar esta página.</p>`,
      false
    );
  }
  if (!process.env.X_CLIENT_ID?.trim()) {
    return paginaOauth("❌ Falta configuración", `<p>Falta X_CLIENT_ID / X_CLIENT_SECRET en el servidor.</p>`, false);
  }

  try {
    const tokens = await canjearCodigoX(code, verifier);
    if (!tokens.ok || !tokens.data.access_token) {
      console.error("x/callback: no se pudo canjear el código", { error: tokens.data.error });
      return paginaOauth(
        "❌ No se pudo canjear el código",
        `<p>${escapeHtml(tokens.data.error_description || tokens.data.error || "Error desconocido")}</p>
         <p>El código sirve una sola vez: volvé a <a href="/admin/configuracion">Configuración</a> y tocá "Conectar X" de nuevo.</p>`,
        false
      );
    }

    const meRes = await fetch(`${X_API}/users/me`, { headers: { Authorization: `Bearer ${tokens.data.access_token}` } });
    const me = (await meRes.json().catch(() => ({}))) as { data?: { id?: string; username?: string; name?: string } };

    const guardado = await guardarCredencialesX({
      token: tokens.data.access_token,
      refreshToken: tokens.data.refresh_token ?? null,
      expiresIn: tokens.data.expires_in ?? 7200,
      userId: me.data?.id ?? null,
      username: me.data?.username ?? null,
    });
    jar.delete({ name: "x_oauth_state", path: "/api/x" });
    jar.delete({ name: "x_oauth_verifier", path: "/api/x" });
    if (!guardado) {
      return paginaOauth(
        "❌ No se pudo guardar la conexión",
        `<p>X autorizó la cuenta pero no se pudo guardar en la base (¿falta aplicar la migración de <code>x_credenciales</code>?).</p>`,
        false
      );
    }
    return paginaOauth(
      "✅ ¡X conectado!",
      `<p>Cuenta: <strong>@${escapeHtml(me.data?.username || "?")}</strong>.</p>
       <p>El token se guardó de forma segura y se renueva solo.</p>
       <p><a href="/admin/configuracion">Volver a Configuración</a></p>`,
      true
    );
  } catch (err) {
    console.error("x/callback: error inesperado:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return paginaOauth("❌ Error inesperado", `<p>${escapeHtml(message)}</p>`, false);
  }
}
