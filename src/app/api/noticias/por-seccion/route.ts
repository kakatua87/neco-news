import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 9;

// Público: pagina las noticias publicadas de una sección para el botón
// "Cargar más noticias" de src/app/[seccion]/page.tsx.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const seccion = (searchParams.get("seccion") || "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10) || 0);

  if (!seccion) {
    return NextResponse.json({ ok: false, error: "Falta seccion" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .ilike("seccion", seccion.replaceAll("-", " "))
    .order("fecha_publicacion", { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  if (error) {
    console.error("Error paginando noticias por sección:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const noticias = data ?? [];
  const hasMore = noticias.length > PAGE_SIZE;

  return NextResponse.json({ ok: true, noticias: noticias.slice(0, PAGE_SIZE), hasMore });
}
