import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { esAdmin } from "@/lib/auth";
import { esListaIds } from "@/lib/validar";

type Body = {
  ids?: Array<string | number>;
  descartar?: boolean;
};

export async function POST(request: Request) {
  try {
    if (!(await esAdmin())) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    if (!esListaIds(body.ids)) {
      return NextResponse.json({ ok: false, error: "ids inválido (lista de 1 a 500 ids)" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    // descartar: no borra, las manda a "Descartadas" (recuperables y conservan el registro anti-duplicados).
    const { error } = body.descartar
      ? await supabase
          .from("noticias")
          .update({ estado: "descartada", es_portada: false, orden_portada: null })
          .in("id", body.ids)
      : await supabase.from("noticias").delete().in("id", body.ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Catch error in POST eliminar-multiple:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
