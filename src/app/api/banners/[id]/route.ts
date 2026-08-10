import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAuth() {
  const supabaseSession = await createSupabaseServerClient();
  const { data: { user }, error } = await supabaseSession.auth.getUser();
  return !error && !!user;
}

const CAMPOS_EDITABLES = [
  "zona",
  "nombre",
  "imagen_url",
  "url_destino",
  "codigo_html",
  "activo",
  "fecha_inicio",
  "fecha_fin",
] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json();

    const patch: Record<string, unknown> = {};
    for (const campo of CAMPOS_EDITABLES) {
      if (campo in body) patch[campo] = body[campo];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
    }
    if (typeof patch.zona === "string") patch.zona = patch.zona.trim();

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("banners")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando banner:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, banner: data });
  } catch (err) {
    console.error("Catch error in PATCH banners/[id]:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) {
    console.error("Error eliminando banner:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
