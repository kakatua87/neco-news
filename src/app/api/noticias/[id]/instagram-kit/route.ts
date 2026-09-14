import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { generarInstagramKit } from "@/lib/instagram-kit";

// El kit de Instagram ahora se genera automaticamente al publicar la
// noticia (ver /api/publicar). Esta ruta queda como fallback manual, por
// si la generacion automatica fallo (ej. la IA no respondio) y hace falta
// reintentar sin republicar la noticia entera.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: noticia, error: fetchError } = await supabase
      .from("noticias")
      .select("titulo, cuerpo, resumen_seo, seccion")
      .eq("id", id)
      .single();

    if (fetchError || !noticia) {
      return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
    }

    await generarInstagramKit(id, noticia);

    const { data: actualizada } = await supabase
      .from("noticias")
      .select("instagram_titulo, instagram_text")
      .eq("id", id)
      .single();

    return NextResponse.json({ ok: true, ...actualizada });
  } catch (err: any) {
    console.error("Catch error in POST instagram-kit:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
