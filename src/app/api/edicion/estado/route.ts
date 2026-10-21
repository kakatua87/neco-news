import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";

/** Estado de la edición (matutina o manual) del scraper y resumen de la última corrida manual. */
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const res = await fetch(`${SCRAPER_URL}/edicion-estado`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` },
      signal: AbortSignal.timeout(20_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error: unknown) {
    const mensaje = error instanceof Error ? error.message : "error desconocido";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
