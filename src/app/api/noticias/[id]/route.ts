import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esAdmin } from "@/lib/auth";
import { esTextoHasta } from "@/lib/validar";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { titulo, cuerpo, imagen_url } = body;

    const supabase = await createSupabaseServerClient();

    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if ((titulo !== undefined && !esTextoHasta(titulo, 300)) || (cuerpo !== undefined && !esTextoHasta(cuerpo, 100000))) {
      return NextResponse.json({ ok: false, error: "Título o cuerpo demasiado largo" }, { status: 400 });
    }

    const update: Record<string, string | null> = {};
    if (typeof titulo === "string" && titulo.trim() !== "") update.titulo = titulo.trim();
    if (typeof cuerpo === "string" && cuerpo.trim() !== "") update.cuerpo = cuerpo.trim();
    if (imagen_url === null || typeof imagen_url === "string") update.imagen_url = imagen_url;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: "Nada para actualizar." }, { status: 400 });
    }

    const { error } = await supabase.from("noticias").update(update).eq("id", id);

    if (error) {
      console.error("Error updating noticia:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in PATCH noticia:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createSupabaseServerClient();

    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const permanente = url.searchParams.get("permanente") === "true";

    const { error } = permanente
      ? await supabase.from("noticias").delete().eq("id", id)
      : await supabase.from("noticias").update({ estado: "descartada" }).eq("id", id);

    if (error) {
      console.error("Error deleting noticia:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in DELETE noticia:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
