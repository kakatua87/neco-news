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

    // Toggle: si ya está en el carrusel de portada, la saca. Si no, la agrega al final.
    const { data: actual, error: fetchError } = await supabase
      .from("noticias")
      .select("es_portada")
      .eq("id", id)
      .single();

    if (fetchError || !actual) {
      return NextResponse.json({ ok: false, error: fetchError?.message || "Noticia no encontrada" }, { status: 404 });
    }

    if (actual.es_portada) {
      const { error: updateError } = await supabase
        .from("noticias")
        .update({ es_portada: false, orden_portada: null })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, en_carrusel: false });
    }

    const { data: maxData } = await supabase
      .from("noticias")
      .select("orden_portada")
      .eq("es_portada", true)
      .order("orden_portada", { ascending: false, nullsFirst: false })
      .limit(1);

    const siguienteOrden = (maxData?.[0]?.orden_portada ?? 0) + 1;

    const { error: updateError } = await supabase
      .from("noticias")
      .update({ es_portada: true, orden_portada: siguienteOrden })
      .eq("id", id);

    if (updateError) {
      console.error("Error set portada:", updateError);
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, en_carrusel: true, orden: siguienteOrden });
  } catch (err: any) {
    console.error("Catch error in POST portada:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
