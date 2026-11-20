import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { superaLimite } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Máximo de largo de un email (RFC 5321). Evita guardar basura enorme.
const EMAIL_MAX = 254;
// Suscripciones por IP y por hora: alcanza para una persona y frena el relleno automático de la lista.
const MAX_SUSCRIPCIONES_POR_IP_POR_HORA = 5;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (typeof body?.email === "string" ? body.email : "").trim().toLowerCase();

    if (!email || email.length > EMAIL_MAX || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    if (await superaLimite(supabase, request, "newsletter", MAX_SUSCRIPCIONES_POR_IP_POR_HORA)) {
      return NextResponse.json(
        { ok: false, error: "Hiciste muchos intentos. Probá de nuevo en un rato." },
        { status: 429 }
      );
    }

    const { error } = await supabase
      .from("suscriptores")
      .insert({ email, activo: true });

    if (error) {
      // Unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, duplicate: true, error: "Ya estás suscripto" }, { status: 409 });
      }
      // El detalle va al log del servidor; al navegador no se le muestra el mensaje interno de la base.
      console.error("Error inserting suscriptor:", error);
      return NextResponse.json({ ok: false, error: "No pudimos suscribirte. Probá de nuevo más tarde." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Catch error in subscribe:", err);
    return NextResponse.json({ ok: false, error: "No pudimos suscribirte. Probá de nuevo más tarde." }, { status: 500 });
  }
}
