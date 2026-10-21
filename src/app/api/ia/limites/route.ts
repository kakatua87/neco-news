import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Limite = { rpm: number | null; rpd: number | null; tpm: number | null; tpd?: number | null };
type Body = { modelos?: Record<string, Limite>; keys?: Record<string, string> };

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

/** Guarda los límites de cada modelo y a qué proyecto de Google pertenece cada key (panel "Uso de IA"). */
export async function PATCH(request: Request) {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Body;

  const modelos: Record<string, Limite> = {};
  for (const [nombre, lim] of Object.entries(body.modelos ?? {})) {
    if (!nombre || nombre.length > 80 || !lim) continue;
    modelos[nombre] = { rpm: numero(lim.rpm), rpd: numero(lim.rpd), tpm: numero(lim.tpm), tpd: numero(lim.tpd) };
  }
  const keys: Record<string, string> = {};
  for (const [sufijo, proyecto] of Object.entries(body.keys ?? {})) {
    const s = sufijo.trim().replace(/^…/, "");
    const p = String(proyecto ?? "").trim();
    if (s.length >= 2 && s.length <= 8 && p && p.length <= 80) keys[s] = p;
  }

  const { error } = await createSupabaseAdminClient()
    .from("scraper_config")
    .update({ ia_limites: { modelos, keys } })
    .eq("id", 1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
