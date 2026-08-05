import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("scraper_config").select("*").eq("id", 1).single();

    if (error) {
      return NextResponse.json(
        { activo: true, fuentes_activas: ["nden", "diarionecochea", "diario4v", "tsn", "diarionq", "elecos"], fecha_inicio: null },
        { status: 200 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("Catch error in GET scraper/config:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

type Body = {
  activo?: boolean;
  fuentes_activas?: string[];
  fecha_inicio?: string | null;
};

export async function POST(request: Request) {
  try {
    const supabaseSession = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseSession.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const supabase = createSupabaseAdminClient();

    const payload: Record<string, any> = { id: 1, updated_at: new Date().toISOString() };
    if (body.activo !== undefined) payload.activo = body.activo;
    if (body.fuentes_activas !== undefined) payload.fuentes_activas = body.fuentes_activas;
    if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;

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
