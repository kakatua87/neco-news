import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

export async function POST() {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("noticias")
      .delete()
      .eq("estado", "descartada")
      .select("id");

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, eliminadas: data?.length ?? 0 });
  } catch (err: any) {
    console.error("Catch error in POST vaciar-descartadas:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
