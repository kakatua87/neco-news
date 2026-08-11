import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const ACCENT = "#1B8B7A";
export const CHARCOAL = "#111827";

export const FORMATOS: Record<string, { width: number; height: number }> = {
  cuadrado: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1350 },
  historia: { width: 1080, height: 1920 },
};

export type NoticiaParaTarjeta = {
  titulo: string;
  instagram_titulo: string | null;
  imagen_url: string | null;
  seccion: string;
};

function leerArchivoBase64(rutaRelativa: string): string {
  const bytes = fs.readFileSync(path.join(process.cwd(), rutaRelativa));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function leerFuente(rutaRelativa: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), rutaRelativa));
}

const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Descarga la foto nosotros mismos (con timeout y UA de navegador) y la
// convertimos a data URI, en vez de dejar que sea satori quien intente el
// fetch remoto: para fotos que siguen viviendo en el portal original
// (no en nuestro Storage) ese fetch server-side de satori suele fallar o
// tardar de más, y satori lo resuelve en silencio como un hueco vacío.
async function obtenerFotoDataUri(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": USER_AGENT } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function normalizarFormato(formatoParam: string | null): string {
  return formatoParam && FORMATOS[formatoParam] ? formatoParam : "cuadrado";
}

export async function renderInstagramCard(noticia: NoticiaParaTarjeta, formatoParam: string): Promise<Response> {
  const formato = normalizarFormato(formatoParam);
  const { width, height } = FORMATOS[formato];

  const titulo = (noticia.instagram_titulo || noticia.titulo || "").slice(0, 110);
  const logoDataUri = leerArchivoBase64("public/logo-oficial.png");
  const fotoDataUri = noticia.imagen_url ? await obtenerFotoDataUri(noticia.imagen_url) : null;
  const headerAlto = Math.round(height * 0.09);
  const fotoAlto = height - headerAlto;
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
            backgroundColor: CHARCOAL,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri} height={Math.round(headerAlto * 0.6)} style={{ objectFit: "contain" }} alt="" />
        </div>

        {/* Foto (o fallback de marca si no se pudo descargar) + overlays */}
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          {fotoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoDataUri}
              width={width}
              height={fotoAlto}
              style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "absolute",
                top: 0,
                left: 0,
                width,
                height: fotoAlto,
                backgroundImage: `linear-gradient(135deg, ${CHARCOAL}, ${ACCENT})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoDataUri} width={Math.round(width * 0.35)} style={{ objectFit: "contain", opacity: 0.85 }} alt="" />
            </div>
          )}

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
