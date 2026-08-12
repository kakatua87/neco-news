import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const anterior = typeof body.anterior === "string" ? body.anterior.trim() : "";
    const nueva = typeof body.nueva === "string" ? body.nueva.trim() : "";

    if (!anterior) {
      return NextResponse.json({ ok: false, error: "Falta la sección actual" }, { status: 400 });
    }
    if (!nueva || nueva.length > 50) {
      return NextResponse.json(
        { ok: false, error: "El nuevo nombre debe tener entre 1 y 50 caracteres" },
        { status: 400 }
      );
    }
    if (nueva === anterior) {
      return NextResponse.json({ ok: true, actualizadas: 0, seccion: nueva });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("noticias")
      .update({ seccion: nueva })
      .eq("seccion", anterior)
      .select("id");

    if (error) {
      console.error("Error renombrando seccion:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, actualizadas: data?.length ?? 0, seccion: nueva });
  } catch (err) {
    console.error("Catch error in POST secciones/renombrar:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
