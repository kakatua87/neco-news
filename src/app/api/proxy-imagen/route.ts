import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const FETCH_TIMEOUT_MS = 10000;

// Reenvía una imagen externa desde el servidor para poder editarla (crop/rotar)
// en un <canvas> sin que el navegador la bloquee por CORS.
export async function GET(request: Request) {
  try {
    const supabaseSession = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");
    if (!target) {
      return NextResponse.json({ ok: false, error: "Falta el parámetro url" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ ok: false, error: "URL inválida" }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ ok: false, error: "Protocolo no permitido" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(parsed.toString(), { signal: controller.signal });
    } catch {
      return NextResponse.json({ ok: false, error: "No se pudo descargar la imagen" }, { status: 502 });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      return NextResponse.json({ ok: false, error: "No se pudo descargar la imagen" }, { status: 502 });
    }
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "El link no apunta a una imagen" }, { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "La imagen pesa demasiado" }, { status: 400 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("Catch error in GET proxy-imagen:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
