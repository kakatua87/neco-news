import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { insertarNoticiaPendiente } from "@/lib/crear-noticia";

// Admin: toma el borrador ya generado (o editado a mano) por el admin y crea
// la noticia en estado 'pendiente', siguiendo desde ahí el flujo normal de
// revisión/publicación que ya existe en el panel.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const borrador = body.borrador;

  if (!borrador?.titulo || !borrador?.cuerpo || !borrador?.slug) {
    return NextResponse.json({ ok: false, error: "Borrador incompleto" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: envio, error: fetchError } = await supabase
    .from("envios_ciudadanos")
    .select("archivos")
    .eq("id", id)
    .single();

  if (fetchError || !envio) {
    return NextResponse.json({ ok: false, error: "Envío no encontrado" }, { status: 404 });
  }

  const primeraImagen = (envio.archivos || []).find((a: { tipo?: string }) => a.tipo?.startsWith("image/"));

  const creada = await insertarNoticiaPendiente(supabase, {
    titulo: borrador.titulo,
    cuerpo: borrador.cuerpo,
    resumen_seo: borrador.resumen_seo ?? null,
    seccion: borrador.seccion_sugerida || "Local",
    estado: "pendiente",
    imagen_url: primeraImagen?.url ?? null,
    instagram_text: borrador.instagram_text ?? null,
    instagram_titulo: borrador.instagram_titulo ?? null,
    twitter_text: borrador.twitter_text ?? null,
    guion_video: borrador.guion_video ?? null,
    slug: borrador.slug,
    es_portada: false,
  });
  if (!creada.ok) {
    return NextResponse.json({ ok: false, error: creada.error }, { status: creada.status });
  }
  const noticia = { id: creada.id };

  const { error: updateError } = await supabase
    .from("envios_ciudadanos")
    .update({ estado: "procesada", noticia_id: noticia.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("Error actualizando envío tras crear noticia:", updateError);
  }

  return NextResponse.json({ ok: true, noticia_id: noticia.id });
}
