import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { seccion } = body;

    if (!seccion || typeof seccion !== "string" || seccion.trim() === "" || seccion.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Seccion inválida. Debe ser texto y menor a 50 caracteres." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("noticias")
      .update({ seccion: seccion.trim() })
      .eq("id", params.id);

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
