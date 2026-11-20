import { NextResponse } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import { SELECT_LISTA, soloImagenPropia, type NoticiaLista } from "@/types/noticia";
import { getCuerposPorId } from "@/lib/noticias";

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

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_LISTA)
    .eq("estado", "publicada")
    .ilike("seccion", seccion.replaceAll("-", " "))
    .order("fecha_publicacion", { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  if (error) {
    console.error("Error paginando noticias por sección:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const traidas = ((data ?? []) as unknown as NoticiaLista[]).map(soloImagenPropia);
  const hasMore = traidas.length > PAGE_SIZE;
  const visibles = traidas.slice(0, PAGE_SIZE);
  // Sin `cuerpo` en la lista; solo se pide, de respaldo, para las notas sin `resumen_seo`.
  const cuerpos = await getCuerposPorId(visibles.filter((n) => n.resumen_seo == null).map((n) => String(n.id)));
  const noticias = visibles.map((n) => (cuerpos.has(String(n.id)) ? { ...n, cuerpo: cuerpos.get(String(n.id)) } : n));

  return NextResponse.json({ ok: true, noticias, hasMore });
}
