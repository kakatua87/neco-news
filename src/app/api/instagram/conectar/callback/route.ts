import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";

function paginaHtml(titulo: string, cuerpoHtml: string, ok: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; color: #111827; }
  h1 { font-size: 20px; }
  .ok { color: #1B8B7A; }
  .error { color: #dc2626; }
  code, .valor { display: block; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 8px 0 20px; }
  .label { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
</style>
</head>
<body>
  <h1 class="${ok ? "ok" : "error"}">${titulo}</h1>
  ${cuerpoHtml}
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error_description") || searchParams.get("error");
  if (errorParam) {
    return paginaHtml("❌ Instagram rechazó la conexión", `<p>${errorParam}</p>`, false);
  }
  if (!code) {
    return paginaHtml("❌ Falta el código", `<p>No llegó el parámetro "code" en la respuesta de Instagram.</p>`, false);
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    return paginaHtml(
      "❌ Falta configuración",
      `<p>Faltan INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET en las variables de entorno del servidor.</p>`,
      false
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://neco-news-seven.vercel.app";
  const redirectUri = `${origin}/api/instagram/conectar/callback`;

  try {
    // Paso 1: canjear el code por un token de corta duración.
    const cortoParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const cortoRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: cortoParams,
    });
    const cortoData = await cortoRes.json();
    if (!cortoRes.ok || !cortoData.access_token) {
      return paginaHtml(
        "❌ No se pudo canjear el código",
        `<pre class="valor">${JSON.stringify(cortoData, null, 2)}</pre>`,
        false
      );
    }

    // Paso 2: canjear el token corto por uno de larga duración (~60 días).
    const largoUrl = new URL("https://graph.instagram.com/access_token");
    largoUrl.searchParams.set("grant_type", "ig_exchange_token");
    largoUrl.searchParams.set("client_secret", appSecret);
    largoUrl.searchParams.set("access_token", cortoData.access_token);
    const largoRes = await fetch(largoUrl.toString());
    const largoData = await largoRes.json();
    if (!largoRes.ok || !largoData.access_token) {
      return paginaHtml(
        "❌ No se pudo generar el token de larga duración",
        `<pre class="valor">${JSON.stringify(largoData, null, 2)}</pre>`,
        false
      );
    }

    // Paso 3: identificar la cuenta conectada.
    const meUrl = new URL("https://graph.instagram.com/me");
    meUrl.searchParams.set("fields", "id,username");
    meUrl.searchParams.set("access_token", largoData.access_token);
    const meRes = await fetch(meUrl.toString());
    const meData = await meRes.json();

    const dias = Math.round((largoData.expires_in || 0) / 86400);

    return paginaHtml(
      "✅ ¡Instagram conectado!",
      `
        <p>Cuenta: <strong>@${meData.username || "?"}</strong> — el token dura ~${dias} días, hay que renovarlo antes de que venza.</p>
        <p class="label">INSTAGRAM_BUSINESS_ACCOUNT_ID</p>
        <div class="valor">${meData.id || "(no se pudo obtener)"}</div>
        <p class="label">INSTAGRAM_GRAPH_TOKEN</p>
        <div class="valor">${largoData.access_token}</div>
        <p>Copiá estos dos valores como variables de entorno en Vercel (Project Settings → Environment Variables) y volvé a hacer deploy.</p>
      `,
      true
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return paginaHtml("❌ Error inesperado", `<p>${message}</p>`, false);
  }
}
