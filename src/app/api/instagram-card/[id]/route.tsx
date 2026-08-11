import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ACCENT = "#1B8B7A";
const CHARCOAL = "#111827";

const FORMATOS: Record<string, { width: number; height: number }> = {
  cuadrado: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1350 },
  historia: { width: 1080, height: 1920 },
};

function leerArchivoBase64(rutaRelativa: string): string {
  const bytes = fs.readFileSync(path.join(process.cwd(), rutaRelativa));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function leerFuente(rutaRelativa: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), rutaRelativa));
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabaseSession = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const formatoParam = searchParams.get("formato") || "cuadrado";
  const formato = FORMATOS[formatoParam] ? formatoParam : "cuadrado";
  const { width, height } = FORMATOS[formato];

  const supabase = createSupabaseAdminClient();
  const { data: noticia, error } = await supabase
    .from("noticias")
    .select("titulo, instagram_titulo, imagen_url, seccion, estado")
    .eq("id", id)
    .single();

  if (error || !noticia || noticia.estado !== "publicada") {
    return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
  }
  if (!noticia.imagen_url) {
    return NextResponse.json({ ok: false, error: "La noticia no tiene imagen" }, { status: 400 });
  }

  const titulo = (noticia.instagram_titulo || noticia.titulo || "").slice(0, 110);
  const logoDataUri = leerArchivoBase64("public/logo-oficial.png");
  const headerAlto = Math.round(height * 0.09);
  const tituloFontSize = formato === "historia" ? 56 : 48;
  const badgeFontSize = formato === "historia" ? 26 : 22;
  const paddingInferior = formato === "historia" ? 220 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width,
          height,
          backgroundColor: CHARCOAL,
          fontFamily: "Inter",
        }}
      >
        {/* Franja de marca */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: headerAlto,
            padding: "0 40px",
            backgroundColor: ACCENT,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri} height={Math.round(headerAlto * 0.6)} style={{ objectFit: "contain" }} alt="" />
        </div>

        {/* Foto + overlays */}
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={noticia.imagen_url}
            width={width}
            height={height - headerAlto}
            style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
            alt=""
          />

          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 32,
              left: 32,
              backgroundColor: ACCENT,
              color: "#fff",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: badgeFontSize,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {noticia.seccion}
          </div>

          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: `60px 40px ${paddingInferior}px`,
              backgroundImage: `linear-gradient(to top, ${CHARCOAL} 30%, transparent)`,
            }}
          >
            <div
              style={{
                display: "flex",
                color: "#fff",
                fontSize: tituloFontSize,
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              {titulo}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Inter", data: leerFuente("public/fonts/Inter-Regular.woff"), weight: 400, style: "normal" },
        { name: "Inter", data: leerFuente("public/fonts/Inter-Bold.woff"), weight: 700, style: "normal" },
        { name: "Inter", data: leerFuente("public/fonts/Inter-ExtraBold.woff"), weight: 800, style: "normal" },
      ],
    }
  );
}
