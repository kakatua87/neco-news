import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

// Totales por banner y por día en un rango (por defecto, últimos 30 días). Solo admin.
export async function GET(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const dias = Math.min(Math.max(Number(url.searchParams.get("dias")) || 30, 1), 365);
  const desde = new Date(Date.now() - (dias - 1) * 86_400_000).toLocaleDateString("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("banner_stats")
    .select("banner_id, dia, impresiones, clics")
    .gte("dia", desde)
    .order("dia", { ascending: true })
    .limit(20000);

  if (error) {
    console.error("Error leyendo estadísticas de banners:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, desde, dias, filas: data });
}
