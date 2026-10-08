import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import {
  DIAS_PARA_RENOVAR,
  diasRestantes,
  guardarCredencialesInstagram,
  obtenerCredencialesInstagram,
} from "@/lib/instagram-credenciales";

async function renovar(forzar: boolean) {
  const cred = await obtenerCredencialesInstagram();
  if (!cred) {
    return NextResponse.json({ ok: false, error: "Instagram no está conectado." }, { status: 400 });
  }
  if (cred.origen === "env") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "El token está en una variable de entorno y no se puede renovar solo. Reconectá Instagram desde Configuración: desde entonces se guarda y se renueva automáticamente.",
      },
      { status: 400 }
    );
  }

  const dias = diasRestantes(cred.expiraEn);
  if (!forzar && dias !== null && dias > DIAS_PARA_RENOVAR) {
    return NextResponse.json({ ok: true, renovado: false, dias_restantes: dias });
  }

  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", cred.token);

  let data: { access_token?: string; expires_in?: number; error?: { message?: string } } = {};
  let ok = false;
  try {
    const res = await fetch(url.toString());
    ok = res.ok;
    data = await res.json().catch(() => ({}));
  } catch (err) {
    console.error("instagram/renovar: error de red:", err);
    return NextResponse.json({ ok: false, error: "No se pudo contactar a Instagram." }, { status: 502 });
  }

  if (!ok || !data.access_token) {
    // Instagram no deja renovar un token vencido o con menos de 24 h de vida: hay que reconectar.
    return NextResponse.json(
      { ok: false, error: data.error?.message || "Instagram rechazó la renovación. Reconectá la cuenta desde Configuración." },
      { status: 502 }
    );
  }

  const guardado = await guardarCredencialesInstagram(data.access_token, cred.igUserId, data.expires_in ?? 0);
  if (!guardado) {
    return NextResponse.json({ ok: false, error: "Se renovó el token pero no se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    renovado: true,
    dias_restantes: Math.floor((data.expires_in ?? 0) / 86_400),
  });
}

// Cron diario de Vercel (vercel.json): manda `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado en el servidor" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return renovar(false);
}

// Botón "Renovar ahora" del panel (solo admins).
export async function POST() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return renovar(true);
}
