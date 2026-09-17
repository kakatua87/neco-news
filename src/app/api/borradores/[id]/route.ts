import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

const CAMPOS_EDITABLES = ["titulo", "contenido_html", "imagen_portada_url", "seccion"];

// Admin: trae un borrador puntual para retomar la edición.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("borradores_redaccion")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "Borrador no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, borrador: data });
}

// Admin: guarda cambios del borrador (botón "Guardar borrador").
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) updates[campo] = body[campo];
  }
  updates.updated_at = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("borradores_redaccion").update(updates).eq("id", id);

  if (error) {
    console.error("Error guardando borrador:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Admin: elimina un borrador que ya no se necesita.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("borradores_redaccion").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
