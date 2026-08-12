import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { enviarPushNotification } from "@/lib/push";

type PushBody = {
  titulo: string;
  cuerpo_corto: string;
  url: string;
  imagen_url?: string;
};

export async function POST(request: Request) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PushBody;

    if (!body.titulo || !body.cuerpo_corto || !body.url) {
      return NextResponse.json({ ok: false, error: "titulo, cuerpo_corto y url son requeridos" }, { status: 400 });
    }

    const resultado = await enviarPushNotification(body);
    if (!resultado.ok) {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: resultado.id });
  } catch (err: any) {
    console.error("Catch error in POST push:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
