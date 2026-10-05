import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { seccion } = body;

    if (!seccion || typeof seccion !== "string" || seccion.trim() === "" || seccion.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Seccion inválida. Debe ser texto y menor a 50 caracteres." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("noticias")
      .update({ seccion: seccion.trim() })
      .eq("id", id);

    if (error) {
      console.error("Error updating seccion:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, seccion: seccion.trim() });
  } catch (err: any) {
    console.error("Catch error in PATCH seccion:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
