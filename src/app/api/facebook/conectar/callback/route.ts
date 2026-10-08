import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { esAdmin } from "@/lib/auth";
import { escapeHtml } from "@/lib/html";
import { paginaOauth } from "@/lib/pagina-oauth";
import {
  FACEBOOK_GRAPH_HOST,
  FACEBOOK_GRAPH_VERSION,
  guardarCredencialesFacebook,
  redirectUriFacebook,
} from "@/lib/facebook-credenciales";

type RespuestaGraph = { access_token?: string; data?: unknown; error?: { message?: string; type?: string; code?: number } };

type PaginaFb = { id: string; name: string; access_token: string };

async function graph(url: URL, init?: RequestInit): Promise<{ ok: boolean; status: number; data: RespuestaGraph }> {
  const res = await fetch(url.toString(), init);
  const data = (await res.json().catch(() => ({}))) as RespuestaGraph;
  return { ok: res.ok, status: res.status, data };
}

export async function GET(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  if (errorParam) {
    return paginaOauth("❌ Facebook rechazó la conexión", `<p>${escapeHtml(errorParam)}</p>`, false);
  }
  const code = searchParams.get("code");
  if (!code) {
    return paginaOauth("❌ Falta el código", `<p>No llegó el parámetro "code" en la respuesta de Facebook.</p>`, false);
  }

  const jar = await cookies();
  const estadoGuardado = jar.get("fb_oauth_state")?.value;
  if (!estadoGuardado || estadoGuardado !== searchParams.get("state")) {
    return paginaOauth(
      "❌ La sesión de conexión no coincide",
      `<p>Volvé a <a href="/admin/configuracion">Configuración</a> y tocá "Conectar Facebook" de nuevo, sin recargar esta página.</p>`,
      false
    );
  }

  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return paginaOauth(
      "❌ Falta configuración",
      `<p>Faltan FACEBOOK_APP_ID / FACEBOOK_APP_SECRET en las variables de entorno del servidor.</p>`,
      false
    );
  }

  const redirectUri = redirectUriFacebook();
  const base = `${FACEBOOK_GRAPH_HOST}/${FACEBOOK_GRAPH_VERSION}`;

  try {
    // Paso 1: canjear el código por un token de usuario de corta duración.
    const cortoUrl = new URL(`${base}/oauth/access_token`);
    cortoUrl.searchParams.set("client_id", appId);
    cortoUrl.searchParams.set("client_secret", appSecret);
    cortoUrl.searchParams.set("redirect_uri", redirectUri);
    cortoUrl.searchParams.set("code", code);
    const corto = await graph(cortoUrl);
    if (!corto.ok || !corto.data.access_token) {
      console.error("facebook/callback: no se pudo canjear el código", { status: corto.status, redirectUri, respuesta: corto.data });
      return paginaOauth(
        "❌ No se pudo canjear el código",
        `<pre class="valor">${escapeHtml(JSON.stringify(corto.data, null, 2))}</pre>
         <p class="label">redirect_uri usada al canjear</p>
         <div class="valor">${escapeHtml(redirectUri)}</div>
         <p class="label">App ID usado y largo del secreto</p>
         <div class="valor">${escapeHtml(appId)} · secreto de ${appSecret.length} caracteres</div>
         <p>El código sirve una sola vez: volvé a <a href="/admin/configuracion">Configuración</a> y tocá "Conectar Facebook" de nuevo, sin recargar.</p>`,
        false
      );
    }

    // Paso 2: pasarlo a un token de usuario de larga duración. Los tokens de Página que salen de este no vencen.
    const largoUrl = new URL(`${base}/oauth/access_token`);
    largoUrl.searchParams.set("grant_type", "fb_exchange_token");
    largoUrl.searchParams.set("client_id", appId);
    largoUrl.searchParams.set("client_secret", appSecret);
    largoUrl.searchParams.set("fb_exchange_token", corto.data.access_token);
    const largo = await graph(largoUrl);
    if (!largo.ok || !largo.data.access_token) {
      console.error("facebook/callback: no se pudo extender el token", { status: largo.status, respuesta: largo.data });
      return paginaOauth(
        "❌ No se pudo extender el token",
        `<pre class="valor">${escapeHtml(JSON.stringify(largo.data, null, 2))}</pre>`,
        false
      );
    }

    // Paso 3: las Páginas que administra la cuenta, cada una con su propio token.
    const paginasUrl = new URL(`${base}/me/accounts`);
    paginasUrl.searchParams.set("fields", "id,name,access_token");
    paginasUrl.searchParams.set("access_token", largo.data.access_token);
    const paginasRes = await graph(paginasUrl);
    const paginas = Array.isArray(paginasRes.data.data) ? (paginasRes.data.data as PaginaFb[]) : [];
    if (!paginasRes.ok || paginas.length === 0) {
      console.error("facebook/callback: sin páginas", { status: paginasRes.status, respuesta: paginasRes.data });
      return paginaOauth(
        "❌ No se encontró ninguna Página",
        `<p>La cuenta que autorizó no administra ninguna Página de Facebook, o no se concedió el permiso para verlas
         (en la ventana de Facebook hay que elegir la Página y aceptar todos los permisos).</p>
         <pre class="valor">${escapeHtml(JSON.stringify(paginasRes.data, null, 2))}</pre>`,
        false
      );
    }

    const pageIdElegido = process.env.FACEBOOK_PAGE_ID?.trim();
    let pagina: PaginaFb | undefined;
    if (pageIdElegido) pagina = paginas.find((p) => p.id === pageIdElegido);
    else if (paginas.length === 1) pagina = paginas[0];

    if (!pagina) {
      const lista = paginas.map((p) => `<li><strong>${escapeHtml(p.name)}</strong> — ID <code>${escapeHtml(p.id)}</code></li>`).join("");
      return paginaOauth(
        "Elegí la Página",
        `<p>La cuenta administra varias Páginas${pageIdElegido ? ` y ninguna coincide con FACEBOOK_PAGE_ID (${escapeHtml(pageIdElegido)})` : ""}.
         Cargá en Vercel la variable <strong>FACEBOOK_PAGE_ID</strong> con el ID de la que querés usar, hacé redeploy y volvé a conectar:</p>
         <ul>${lista}</ul>`,
        false
      );
    }

    const guardado = await guardarCredencialesFacebook(pagina.access_token, pagina.id, pagina.name);
    jar.delete({ name: "fb_oauth_state", path: "/api/facebook" });
    if (!guardado) {
      return paginaOauth(
        "❌ No se pudo guardar la conexión",
        `<p>Facebook autorizó la Página <strong>${escapeHtml(pagina.name)}</strong> pero no se pudo guardar en la base
         (¿falta aplicar la migración de <code>facebook_credenciales</code>?).</p>`,
        false
      );
    }
    return paginaOauth(
      "✅ ¡Facebook conectado!",
      `<p>Página: <strong>${escapeHtml(pagina.name)}</strong>.</p>
       <p>El token se guardó de forma segura. No hace falta copiar nada ni tocar Vercel.</p>
       <p><a href="/admin/configuracion">Volver a Configuración</a></p>`,
      true
    );
  } catch (err) {
    console.error("facebook/callback: error inesperado:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return paginaOauth("❌ Error inesperado", `<p>${escapeHtml(message)}</p>`, false);
  }
}
