import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/auth";

/**
 * Devuelve una noticia a "pendiente": sirve para despublicar una publicada o
 * restaurar una descartada. Es la única transición que se permite desde acá
 * (publicar y descartar tienen sus propias rutas).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body?.estado !== "pendiente") {
      return NextResponse.json({ ok: false, error: "Solo se puede devolver una noticia a 'pendiente'." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("noticias")
      .update({ estado: "pendiente", es_portada: false, orden_portada: null })
      .eq("id", id)
      .in("estado", ["publicada", "descartada"])
      .select("id");

    if (error) {
      console.error("Error cambiando estado de noticia:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: "La noticia no existe o ya está pendiente." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Catch error in POST noticia/estado:", err);
    return NextResponse.json({ ok: false, error: "Error inesperado" }, { status: 500 });
  }
}
