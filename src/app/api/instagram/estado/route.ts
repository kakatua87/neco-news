import { NextResponse } from "next/server";
import { esAdmin } from "@/lib/auth";
import { DIAS_ALERTA, diasRestantes, obtenerCredencialesInstagram } from "@/lib/instagram-credenciales";

// Admin: estado de la conexión con Instagram para el panel de Configuración. Nunca devuelve el token.
export async function GET() {
  if (!(await esAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const cred = await obtenerCredencialesInstagram();
  if (!cred) {
    return NextResponse.json({ ok: true, conectado: false });
  }
  const dias = diasRestantes(cred.expiraEn);
  return NextResponse.json({
    ok: true,
    conectado: true,
    origen: cred.origen,
    expira_en: cred.expiraEn,
    dias_restantes: dias,
    alerta: dias !== null && dias <= DIAS_ALERTA,
  });
}
