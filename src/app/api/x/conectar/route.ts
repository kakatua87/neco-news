import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { esAdmin } from "@/lib/auth";
import { redirectUriX } from "@/lib/x-credenciales";

// Arranca el login OAuth 2.0 (con PKCE) de X para conseguir el token de la cuenta donde publica el panel.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.X_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Falta X_CLIENT_ID en las variables de entorno (es el Client ID de la app en developer.x.com)." },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const url = new URL("https://x.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUriX());
  url.searchParams.set("scope", "tweet.read tweet.write users.read media.write offline.access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(url.toString());
  const opciones = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/api/x" };
  res.cookies.set("x_oauth_state", state, opciones);
  res.cookies.set("x_oauth_verifier", verifier, opciones);
  return res;
}
