import { NextResponse } from "next/server";
import { tieneSecretoInterno } from "@/lib/auth";
import { enviarPushNotification } from "@/lib/push";

type NotifBody = {
  titulo: string;
  cuerpo_corto: string;
};

export async function POST(request: Request) {
  try {
    if (!tieneSecretoInterno(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as NotifBody;

    if (!body.titulo || !body.cuerpo_corto) {
      return NextResponse.json({ ok: false, error: "titulo y cuerpo_corto son requeridos" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neco-news.vercel.app";

    const resultado = await enviarPushNotification({
      titulo: body.titulo,
      cuerpo_corto: body.cuerpo_corto,
      url: `${baseUrl}/admin`,
    });

    if (!resultado.ok) {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: resultado.id });
  } catch (err: any) {
    console.error("Catch error in POST notificaciones/nuevo-grupo:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
