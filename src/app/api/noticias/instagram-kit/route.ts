import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("noticias")
      .select("id, titulo, instagram_titulo, instagram_text, imagen_url, imagen_fuente, slug, seccion, fecha_publicacion")
      .eq("estado", "publicada")
      .order("fecha_publicacion", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching instagram-kit:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("Catch error in GET instagram-kit:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
