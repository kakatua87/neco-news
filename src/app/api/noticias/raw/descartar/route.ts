import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const grupo_id = searchParams.get("grupo_id");
  const fecha = searchParams.get("fecha"); // formato: YYYY-MM-DD

  const supabase = createSupabaseAdminClient();

  // Descartar por grupo_id individual
  if (grupo_id) {
    const { error } = await supabase
      .from("noticias")
      .update({ estado: "descartada" })
      .eq("grupo_id", grupo_id)
      .eq("estado", "raw");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Descartar todas las raw de una fecha completa
  if (fecha) {
    const inicio = `${fecha}T00:00:00+00:00`;
    const fin = `${fecha}T23:59:59+00:00`;

    const { data, error } = await supabase
      .from("noticias")
      .update({ estado: "descartada" })
      .eq("estado", "raw")
      .gte("created_at", inicio)
      .lte("created_at", fin)
      .select("id");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, descartadas: data?.length ?? 0 });
  }

  return NextResponse.json({ ok: false, error: "grupo_id o fecha requerido" }, { status: 400 });
}
