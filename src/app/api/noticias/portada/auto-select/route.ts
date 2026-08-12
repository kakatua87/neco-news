import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// La selección real (hasta 3 noticias del día en curso, una por sección) vive
// en la función SQL `actualizar_carrusel_portada`, que además corre sola vía
// trigger cada vez que una noticia pasa a "publicada" (desde la web, el admin
// o el scraper). Esta ruta queda como respaldo por si se necesita forzar un
// recálculo manual o desde un cron, por eso se autentica con un secreto
// compartido en vez de cookies.
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado en el servidor" }, { status: 500 });
    }
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("actualizar_carrusel_portada");
    if (error) {
      console.error("Error recalculando carrusel de portada:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: seleccionadas } = await supabase
      .from("noticias")
      .select("id, seccion, titulo, orden_portada")
      .eq("es_portada", true)
      .order("orden_portada", { ascending: true });

    return NextResponse.json({ ok: true, seleccionadas: seleccionadas ?? [] });
  } catch (err) {
    console.error("Catch error in GET noticias/portada/auto-select:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
