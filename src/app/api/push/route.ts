import { NextResponse } from "next/server";

type PushBody = {
  titulo: string;
  cuerpo_corto: string;
  url: string;
  imagen_url?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PushBody;

    if (!body.titulo || !body.cuerpo_corto || !body.url) {
      return NextResponse.json({ ok: false, error: "titulo, cuerpo_corto y url son requeridos" }, { status: 400 });
    }

    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json({ ok: false, error: "OneSignal no configurado" }, { status: 500 });
    }

    const payload: Record<string, any> = {
      app_id: appId,
      included_segments: ["All"],
      headings: { en: body.titulo },
      contents: { en: body.cuerpo_corto.slice(0, 100) },
      url: body.url,
    };

    if (body.imagen_url) {
      payload.big_picture = body.imagen_url;
      payload.chrome_web_image = body.imagen_url;
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("OneSignal error:", data);
      return NextResponse.json({ ok: false, error: data?.errors?.[0] ?? "Error OneSignal" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("Catch error in POST push:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
