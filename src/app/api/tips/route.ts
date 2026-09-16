import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";

const CATEGORIAS = ["Denuncia", "Dato/Info", "Evento", "Foto/Video", "Obituario", "Otro"];

async function notificarTelegram(mensaje: string, categoria: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📬 Nuevo envío ciudadano (${categoria})\n\n${mensaje.slice(0, 300)}`,
      }),
    });
  } catch (err) {
    console.error("Error notificando a Telegram:", err);
  }
}

// Público: lo usa el wizard del botón flotante para mandar un envío ciudadano.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nombre = (body.nombre ?? "").toString().trim() || null;
    const telefono = (body.telefono ?? "").toString().trim() || null;
    const categoria = (body.categoria ?? "").toString().trim();
    const mensaje = (body.mensaje ?? "").toString().trim();
    const archivos = Array.isArray(body.archivos) ? body.archivos : [];

    if (!CATEGORIAS.includes(categoria)) {
      return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
    }
    if (mensaje.length < 10) {
      return NextResponse.json({ ok: false, error: "Contanos un poco más (mínimo 10 caracteres)" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("envios_ciudadanos")
      .insert({ nombre, telefono, categoria, mensaje, archivos })
      .select("id")
      .single();

    if (error) {
      console.error("Error insertando envío ciudadano:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    notificarTelegram(mensaje, categoria);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("Catch error in POST tips:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Admin: lista los envíos para la pestaña "Envíos" del panel.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("envios_ciudadanos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error listando envíos ciudadanos:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, envios: data || [] });
}
