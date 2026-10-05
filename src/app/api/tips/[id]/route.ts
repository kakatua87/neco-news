import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

import { esTextoHasta } from "@/lib/validar";

const CAMPOS_EDITABLES = ["nombre", "telefono", "categoria", "mensaje", "estado"];
const ESTADOS = ["nuevo", "en_revision", "procesada", "descartada"];
const CATEGORIAS = ["Denuncia", "Dato/Info", "Evento", "Otro"];

// Admin: edita un envío (mensaje/categoría antes de generar la nota, o cambia el estado).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }
  if ("estado" in body && !ESTADOS.includes(body.estado)) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
  }
  if ("categoria" in body && !CATEGORIAS.includes(body.categoria)) {
    return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
  }
  if (
    ("mensaje" in body && !esTextoHasta(body.mensaje, 5000)) ||
    ("nombre" in body && !esTextoHasta(body.nombre ?? "", 100)) ||
    ("telefono" in body && !esTextoHasta(body.telefono ?? "", 40))
  ) {
    return NextResponse.json({ ok: false, error: "Texto demasiado largo" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (campo in body) updates[campo] = body[campo];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("envios_ciudadanos").update(updates).eq("id", id);

  if (error) {
    console.error("Error actualizando envío ciudadano:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
