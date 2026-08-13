import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("scraper_config").select("*").eq("id", 1).single();

    if (error) {
      return NextResponse.json(
        { activo: true, fuentes_activas: ["nden", "diarionecochea", "diario4v", "tsn", "diarionq", "elecos"], fecha_inicio: null, fuentes_custom: [] },
        { status: 200 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("Catch error in GET scraper/config:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

type FuenteCustom = { key: string; label: string; url: string };

type Body = {
  activo?: boolean;
  fuentes_activas?: string[];
  fecha_inicio?: string | null;
  fuentes_custom?: FuenteCustom[];
};

function validarFuentesCustom(fuentes: unknown): FuenteCustom[] | null {
  if (!Array.isArray(fuentes)) return null;
  const limpias: FuenteCustom[] = [];
  for (const f of fuentes) {
    if (!f || typeof f !== "object") return null;
    const { key, label, url } = f as Record<string, unknown>;
    if (typeof key !== "string" || !key.trim()) return null;
    if (typeof label !== "string" || !label.trim()) return null;
    if (typeof url !== "string") return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    limpias.push({ key: key.trim(), label: label.trim().slice(0, 60), url: parsed.toString() });
  }
  return limpias;
}

export async function POST(request: Request) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const supabase = createSupabaseAdminClient();

    const payload: Record<string, any> = { id: 1, updated_at: new Date().toISOString() };
    if (body.activo !== undefined) payload.activo = body.activo;
    if (body.fuentes_activas !== undefined) payload.fuentes_activas = body.fuentes_activas;
    if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
    if (body.fuentes_custom !== undefined) {
      const limpias = validarFuentesCustom(body.fuentes_custom);
      if (limpias === null) {
        return NextResponse.json({ ok: false, error: "fuentes_custom inválido: revisá que cada fuente tenga key, label y una url http(s) válida." }, { status: 400 });
      }
      payload.fuentes_custom = limpias;
    }

    const { error } = await supabase.from("scraper_config").upsert(payload);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in POST scraper/config:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
