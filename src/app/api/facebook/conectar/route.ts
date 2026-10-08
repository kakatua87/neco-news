import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { esAdmin } from "@/lib/auth";
import { FACEBOOK_GRAPH_VERSION, redirectUriFacebook } from "@/lib/facebook-credenciales";

// Arranca el login de Facebook para conseguir el token de la Página donde se publica. Es un login distinto al de
// Instagram: el token de Instagram Login no puede publicar en una Página.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.FACEBOOK_APP_ID?.trim();
  if (!appId) {
    return NextResponse.json(
      { ok: false, error: "Falta FACEBOOK_APP_ID en las variables de entorno (es el ID de la app de Meta)." },
      { status: 500 }
    );
  }

  const redirectUri = redirectUriFacebook();
  // `state` protege contra que alguien le haga completar un login ajeno: se guarda en una cookie y se compara al volver.
  const state = randomBytes(16).toString("hex");

  const url = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  // Fuerza a Facebook a mostrar de nuevo el diálogo de permisos y de elección de Páginas: si el usuario ya había
  // autorizado la app, Facebook lo saltea y el token queda sin ninguna Página asociada.
  url.searchParams.set("auth_type", "rerequest");
  // Con "Facebook Login for Business" Meta exige una configuración (config_id) en lugar de scope; si no hay, se usa scope.
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID?.trim();
  if (configId) {
    url.searchParams.set("config_id", configId);
  } else {
    url.searchParams.set("scope", "pages_show_list,pages_manage_posts,pages_read_engagement");
  }

  console.log("facebook/conectar: redirect_uri enviada a Facebook:", redirectUri, configId ? "(con config_id)" : "(con scope)");
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("fb_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/facebook" });
  return res;
}
