import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";

// Arranca el login OAuth de Instagram (producto "API de Instagram con inicio
// de sesión de Instagram para empresas") para conseguir el token de acceso
// de la cuenta profesional. El Explorador de la API Graph de Meta NO sirve
// para esto: ese solo emite tokens vía login de Facebook, y este producto
// usa un flujo de login propio de Instagram.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { ok: false, error: "Falta INSTAGRAM_APP_ID en las variables de entorno." },
      { status: 500 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://neco-news-seven.vercel.app";
  const redirectUri = `${origin}/api/instagram/conectar/callback`;
  const scope = "instagram_business_basic,instagram_business_content_publish";

  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scope);

  return NextResponse.redirect(authorizeUrl.toString());
}
