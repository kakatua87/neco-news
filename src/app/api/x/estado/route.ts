import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { obtenerCredencialesX } from "@/lib/x-credenciales";

// Admin: estado de la conexión con X para Configuración. Nunca devuelve los tokens.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const cred = await obtenerCredencialesX();
  if (!cred) return NextResponse.json({ ok: true, conectado: false });
  return NextResponse.json({ ok: true, conectado: true, cuenta: cred.username });
}
