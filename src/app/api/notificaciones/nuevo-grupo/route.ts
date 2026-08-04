import { NextResponse } from "next/server";

type NotifBody = {
  titulo: string;
  cuerpo_corto: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifBody;

    if (!body.titulo || !body.cuerpo_corto) {
      return NextResponse.json({ ok: false, error: "titulo y cuerpo_corto son requeridos" }, { status: 400 });
    }

    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json({ ok: false, error: "OneSignal no configurado" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://neco-news.vercel.app";

    const payload = {
      app_id: appId,
      included_segments: ["All"],
      headings: { en: body.titulo },
      contents: { en: body.cuerpo_corto.slice(0, 150) },
      url: `${baseUrl}/admin`,
    };

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
    console.error("Catch error in POST notificaciones/nuevo-grupo:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
