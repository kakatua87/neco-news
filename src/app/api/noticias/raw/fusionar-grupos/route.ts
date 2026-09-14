import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const grupo_id_destino = body?.grupo_id_destino;
  const grupo_id_origen = body?.grupo_id_origen;

  if (!grupo_id_destino || !grupo_id_origen) {
    return NextResponse.json(
      { ok: false, error: "grupo_id_destino y grupo_id_origen son requeridos" },
      { status: 400 }
    );
  }
  if (grupo_id_destino === grupo_id_origen) {
    return NextResponse.json({ ok: false, error: "Los dos grupos son el mismo" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Reasigna el grupo_id de todas las notas raw del grupo origen al destino
  // -- equivalente a que el scraper las hubiera agrupado bien desde el vamos.
  const { error } = await supabase
    .from("noticias")
    .update({ grupo_id: grupo_id_destino })
    .eq("grupo_id", grupo_id_origen)
    .eq("estado", "raw");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
