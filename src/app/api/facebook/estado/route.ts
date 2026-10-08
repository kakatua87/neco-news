import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { obtenerCredencialesFacebook } from "@/lib/facebook-credenciales";

// Admin: estado de la conexión con la Página de Facebook para Configuración. Nunca devuelve el token.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const cred = await obtenerCredencialesFacebook();
  if (!cred) return NextResponse.json({ ok: true, conectado: false });
  return NextResponse.json({ ok: true, conectado: true, pagina: cred.pageName });
}
