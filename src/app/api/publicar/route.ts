import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = {
  id?: number;
  titulo?: string;
  cuerpo?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "id requerido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const payload: Record<string, string> = {
    estado: "publicada",
    fecha_publicacion: new Date().toISOString(),
  };
  if (body.titulo) payload.titulo = body.titulo;
  if (body.cuerpo) payload.cuerpo = body.cuerpo;

  const { error } = await supabase.from("noticias").update(payload).eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
