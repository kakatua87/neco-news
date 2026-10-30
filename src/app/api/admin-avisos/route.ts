import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { vigilarScraping } from "@/lib/vigilante-scraping";

export const dynamic = "force-dynamic";

/** Avisos del panel (campana): los últimos 20 y cuántos faltan leer. */
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const admin = createSupabaseAdminClient();
  await vigilarScraping(admin); // si el scraping se frenó, el aviso entra en esta misma respuesta
  const [lista, noLeidas] = await Promise.all([
    admin.from("admin_notificaciones").select("id, ts, tipo, titulo, detalle, leida").order("id", { ascending: false }).limit(20),
    admin.from("admin_notificaciones").select("id", { count: "exact", head: true }).eq("leida", false),
  ]);
  if (lista.error) return NextResponse.json({ ok: false, error: lista.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: lista.data ?? [], noLeidas: noLeidas.count ?? 0 });
}

/** Marca todos los avisos como leídos. */
export async function POST() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await createSupabaseAdminClient().from("admin_notificaciones").update({ leida: true }).eq("leida", false);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
