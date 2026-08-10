import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAuth() {
  const supabaseSession = await createSupabaseServerClient();
  const { data: { user }, error } = await supabaseSession.auth.getUser();
  return !error && !!user;
}

// Lista todos los banners (activos e inactivos) para el panel de admin.
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("zona", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listando banners:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, banners: data });
}

export async function POST(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const zona = typeof body.zona === "string" ? body.zona.trim() : "";
    if (!zona) {
      return NextResponse.json({ ok: false, error: "Falta la zona" }, { status: 400 });
    }
    const imagenUrl = typeof body.imagen_url === "string" ? body.imagen_url.trim() : "";
    const codigoHtml = typeof body.codigo_html === "string" ? body.codigo_html.trim() : "";
    if (!imagenUrl && !codigoHtml) {
      return NextResponse.json({ ok: false, error: "Cargá una imagen o un código HTML" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("banners")
      .insert({
        zona,
        nombre: typeof body.nombre === "string" ? body.nombre.trim() || null : null,
        imagen_url: imagenUrl || null,
        url_destino: typeof body.url_destino === "string" ? body.url_destino.trim() || null : null,
        codigo_html: codigoHtml || null,
        activo: body.activo !== false,
        fecha_inicio: body.fecha_inicio || null,
        fecha_fin: body.fecha_fin || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando banner:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, banner: data });
  } catch (err) {
    console.error("Catch error in POST banners:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
