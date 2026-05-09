import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ ok: false, error: "Email inválido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from("suscriptores")
      .insert({ email, activo: true });

    if (error) {
      // Unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json({ ok: false, duplicate: true, error: "Ya estás suscripto" }, { status: 409 });
      }
      console.error("Error inserting suscriptor:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in subscribe:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
