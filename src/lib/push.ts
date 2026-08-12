type PushArgs = {
  titulo: string;
  cuerpo_corto: string;
  url: string;
  imagen_url?: string;
};

/**
 * Envía una notificación push a todos los suscriptores vía OneSignal.
 * Solo debe llamarse desde código server-side ya autenticado/autorizado —
 * esta función no valida nada por sí misma, blastea a "All" sin filtro.
 */
export async function enviarPushNotification(args: PushArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return { ok: false, error: "OneSignal no configurado" };
  }

  const payload: Record<string, any> = {
    app_id: appId,
    included_segments: ["All"],
    headings: { en: args.titulo },
    contents: { en: args.cuerpo_corto.slice(0, 100) },
    url: args.url,
  };

  if (args.imagen_url) {
    payload.big_picture = args.imagen_url;
    payload.chrome_web_image = args.imagen_url;
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
    return { ok: false, error: data?.errors?.[0] ?? "Error OneSignal" };
  }

  return { ok: true, id: data.id };
}
