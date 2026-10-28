import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { generarInstagramKit } from "@/lib/instagram-kit";
import { corregirNombres } from "@/lib/correccion-nombres";
import { esTextoHasta } from "@/lib/validar";

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

// Edición manual del copy de redes (título de la tarjeta + texto del caption) desde la pestaña Redes:
// lo que se guarda acá es lo que se publica en Instagram, Facebook y X. Se corrigen los nombres propios
// mal escritos ("Necotchea") por si el editor deja alguno.
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { instagram_titulo, instagram_text } = body ?? {};
    if (!esTextoHasta(instagram_titulo, 200) || !instagram_titulo.trim()) {
      return NextResponse.json({ ok: false, error: "El título no puede estar vacío (máx. 200 caracteres)" }, { status: 400 });
    }
    if (!esTextoHasta(instagram_text, 3000)) {
      return NextResponse.json({ ok: false, error: "El texto es demasiado largo (máx. 3000 caracteres)" }, { status: 400 });
    }

    const guardado = {
      instagram_titulo: corregirNombres(instagram_titulo.trim()),
      instagram_text: corregirNombres(instagram_text.trim()),
    };
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("noticias").update(guardado).eq("id", id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...guardado });
  } catch (err: any) {
    console.error("Catch error in PATCH instagram-kit:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
