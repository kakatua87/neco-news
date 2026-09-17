import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Admin: lista los borradores de la pestaña "Redacción", más recientes primero.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("borradores_redaccion")
    .select("id, titulo, seccion, estado, imagen_portada_url, autor_email, noticia_id, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listando borradores:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, borradores: data || [] });
}

// Admin: crea un borrador nuevo.
export async function POST(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabaseServer = await createSupabaseServerClient();
  const { data: { user } } = await supabaseServer.auth.getUser();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("borradores_redaccion")
    .insert({
      titulo: body.titulo ?? "",
      contenido_html: body.contenido_html ?? "",
      imagen_portada_url: body.imagen_portada_url ?? null,
      seccion: body.seccion || "Local",
      autor_email: user?.email ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creando borrador:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
