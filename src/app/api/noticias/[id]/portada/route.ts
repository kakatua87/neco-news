import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // 1. Quitar es_portada de todas las de hoy
    const { error: resetError } = await supabase
      .from("noticias")
      .update({ es_portada: false })
      .eq("estado", "publicada")
      .gte("fecha_publicacion", startOfDay.toISOString());

    if (resetError) {
      console.error("Error reset portada:", resetError);
      return NextResponse.json({ ok: false, error: resetError.message }, { status: 500 });
    }

    // 2. Marcar la nueva
    const { error: updateError } = await supabase
      .from("noticias")
      .update({ es_portada: true })
      .eq("id", id);

    if (updateError) {
      console.error("Error set portada:", updateError);
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in POST portada:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
