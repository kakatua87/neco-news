import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TelegramWebhookBody = {
  callback_query?: {
    data?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as TelegramWebhookBody;
  const data = body.callback_query?.data;

  if (!data) {
    return NextResponse.json({ ok: false, error: "callback_query.data requerido" }, { status: 400 });
  }

  const [action, idRaw] = data.split("_");
  const id = Number(idRaw);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ ok: false, error: "id invalido" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (action === "pub") {
    const { error } = await supabase
      .from("noticias")
      .update({
        estado: "publicada",
        fecha_publicacion: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (action === "des") {
    const { error } = await supabase.from("noticias").update({ estado: "descartada" }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ ok: false, error: "accion no soportada" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
