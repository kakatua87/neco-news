import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const grupo_id = searchParams.get("grupo_id");

  if (!grupo_id) {
    return NextResponse.json({ ok: false, error: "grupo_id requerido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
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
