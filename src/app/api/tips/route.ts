import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { validarArchivosEnvio } from "@/lib/validar";
import { superaLimite } from "@/lib/rate-limit";

const CATEGORIAS = ["Denuncia", "Dato/Info", "Evento", "Otro"];

// Tope global de envíos por hora: sin captcha ni IP en la tabla, es lo que evita que alguien
// inunde la bandeja y el chat de Telegram.
const MAX_ENVIOS_POR_HORA = 60;
// Por visitante (IP hasheada): un vecino real manda pocos avisos por hora.
const MAX_ENVIOS_POR_IP_POR_HORA = 5;

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
    // Honeypot: el campo está oculto para las personas; si viene lleno es un bot. Se responde "ok" sin
    // guardar nada para no darle pistas.
    if (typeof body.sitio_web === "string" && body.sitio_web.trim() !== "") {
      return NextResponse.json({ ok: true, id: null });
    }
    const nombre = (body.nombre ?? "").toString().trim().slice(0, 100) || null;
    const telefono = (body.telefono ?? "").toString().trim().slice(0, 40) || null;
    const categoria = (body.categoria ?? "").toString().trim();
    const mensaje = (body.mensaje ?? "").toString().trim();
    const archivos = validarArchivosEnvio(body.archivos);
    if (archivos === null) {
      return NextResponse.json({ ok: false, error: "Archivos inválidos" }, { status: 400 });
    }

    if (!CATEGORIAS.includes(categoria)) {
      return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
    }
    if (mensaje.length < 10) {
      return NextResponse.json({ ok: false, error: "Contanos un poco más (mínimo 10 caracteres)" }, { status: 400 });
    }

    if (mensaje.length > 5000) {
      return NextResponse.json({ ok: false, error: "El mensaje es demasiado largo (máximo 5000 caracteres)" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    if (await superaLimite(supabase, request, "envio", MAX_ENVIOS_POR_IP_POR_HORA)) {
      return NextResponse.json(
        { ok: false, error: "Mandaste varios avisos seguidos. Esperá un rato antes de enviar otro." },
        { status: 429 }
      );
    }
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("envios_ciudadanos")
      .select("id", { count: "exact", head: true })
      .gte("created_at", desde);
    if ((count ?? 0) >= MAX_ENVIOS_POR_HORA) {
      return NextResponse.json({ ok: false, error: "Recibimos muchos envíos en este momento. Probá de nuevo en un rato." }, { status: 429 });
    }

    const { data, error } = await supabase
      .from("envios_ciudadanos")
      .insert({ nombre, telefono, categoria, mensaje, archivos })
      .select("id")
      .single();

    if (error) {
      console.error("Error insertando envío ciudadano:", error);
      return NextResponse.json({ ok: false, error: "No pudimos guardar tu envío. Probá de nuevo." }, { status: 500 });
    }

    notificarTelegram(mensaje, categoria);

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("Catch error in POST tips:", err);
    return NextResponse.json({ ok: false, error: "No pudimos guardar tu envío. Probá de nuevo." }, { status: 500 });
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
