import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderInstagramCard, normalizarFormato } from "../render";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabaseSession = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const formato = normalizarFormato(searchParams.get("formato"));

  const supabase = createSupabaseAdminClient();
  const { data: noticia, error } = await supabase
    .from("noticias")
    .select("titulo, instagram_titulo, imagen_url, seccion, estado")
    .eq("id", id)
    .single();

  if (error || !noticia || noticia.estado !== "publicada") {
    return NextResponse.json({ ok: false, error: "Noticia no encontrada" }, { status: 404 });
  }
  if (!noticia.imagen_url) {
    return NextResponse.json({ ok: false, error: "La noticia no tiene imagen" }, { status: 400 });
  }

  return renderInstagramCard(noticia, formato);
}
