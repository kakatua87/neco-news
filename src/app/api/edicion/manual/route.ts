import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";

// Render free duerme el servicio: despertarlo puede tardar ~1 min antes de que acepte el pedido.
export const maxDuration = 90;

type Item = { grupo_id: string; fuentes_ids?: (string | number)[]; seccion?: string };

/** Botón "Publicar con IA" de la Bandeja: dispara la edición manual del scraper (grupos elegidos o los de hoy). */
export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { items?: Item[]; solo_hoy?: boolean; tope?: number };
    const items = Array.isArray(body.items) ? body.items.filter((i) => i && typeof i.grupo_id === "string") : [];
    const soloHoy = body.solo_hoy === true;
    if (items.length === 0 && !soloHoy) {
      return NextResponse.json({ ok: false, error: "Elegí grupos o usá 'hoy'" }, { status: 400 });
    }
    const tope = Math.max(1, Math.min(20, Math.floor(Number(body.tope) || 4)));

    const SCRAPER_URL = process.env.SCRAPER_URL || "https://neco-news-scraper.onrender.com";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
    };

    // Despierta el servicio antes del pedido real.
    await fetch(`${SCRAPER_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(60_000) }).catch(() => null);

    const res = await fetch(`${SCRAPER_URL}/edicion-manual`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ items, solo_hoy: soloHoy, tope }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error: unknown) {
    console.error("Error disparando la edición manual:", error);
    const mensaje = error instanceof Error ? error.message : "error desconocido";
    return NextResponse.json({ ok: false, error: mensaje }, { status: 500 });
  }
}
