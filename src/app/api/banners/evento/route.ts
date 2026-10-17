import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esBot, esUuid } from "@/lib/banner-tracking";

// Registra impresiones (visualizaciones reales) de banners. Los clics van por /api/banners/click/[id].
// Pública a propósito: solo suma contadores agregados por día y no guarda datos del visitante.
export async function POST(request: Request) {
  try {
    if (esBot(request)) return NextResponse.json({ ok: true });

    const body = await request.json().catch(() => null);
    const ids: unknown[] = Array.isArray(body?.ids) ? body.ids.slice(0, 20) : [];
    const validos = [...new Set(ids.filter(esUuid))];
    if (validos.length === 0) return NextResponse.json({ ok: true });

    const supabase = createSupabaseAdminClient();
    await Promise.all(validos.map((id) => supabase.rpc("banner_registrar", { p_banner: id, p_tipo: "impresion" })));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error registrando impresión de banner:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
