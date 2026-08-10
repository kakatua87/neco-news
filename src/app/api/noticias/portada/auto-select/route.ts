import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SECCIONES_EXCLUIDAS = ["Obituarios", "Farmacias"];
const CANDIDATOS_LIMIT = 50;
const CANTIDAD_PORTADA = 3;

type Candidata = { id: string | number; seccion: string };

// Selecciona automáticamente las noticias del carrusel de portada del día:
// una por sección distinta (más reciente de cada una), completando con las
// más recientes restantes si no hay suficiente variedad de secciones.
// Pensado para dispararse desde un cron (Vercel Cron u otro) sin sesión de
// admin, por eso se autentica con un secreto compartido en vez de cookies.
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

    let query = supabase
      .from("noticias")
      .select("id, seccion")
      .eq("estado", "publicada");
    for (const seccion of SECCIONES_EXCLUIDAS) {
      query = query.neq("seccion", seccion);
    }
    const { data: candidatas, error: fetchError } = await query
      .order("fecha_publicacion", { ascending: false, nullsFirst: false })
      .limit(CANDIDATOS_LIMIT);

    if (fetchError) {
      console.error("Error trayendo candidatas para portada:", fetchError);
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }
    if (!candidatas || candidatas.length === 0) {
      return NextResponse.json({ ok: true, seleccionadas: [], mensaje: "No hay noticias publicadas para elegir" });
    }

    const seleccionadas: Candidata[] = [];
    const seccionesUsadas = new Set<string>();

    // 1ra pasada: una por sección distinta, respetando el orden de recencia
    for (const nota of candidatas as Candidata[]) {
      if (seleccionadas.length >= CANTIDAD_PORTADA) break;
      if (seccionesUsadas.has(nota.seccion)) continue;
      seleccionadas.push(nota);
      seccionesUsadas.add(nota.seccion);
    }

    // 2da pasada: completar con las más recientes restantes si faltó variedad
    if (seleccionadas.length < CANTIDAD_PORTADA) {
      const yaElegidas = new Set(seleccionadas.map((n) => n.id));
      for (const nota of candidatas as Candidata[]) {
        if (seleccionadas.length >= CANTIDAD_PORTADA) break;
        if (yaElegidas.has(nota.id)) continue;
        seleccionadas.push(nota);
        yaElegidas.add(nota.id);
      }
    }

    const { error: limpiarError } = await supabase
      .from("noticias")
      .update({ es_portada: false, orden_portada: null })
      .eq("es_portada", true);
    if (limpiarError) {
      console.error("Error limpiando portada anterior:", limpiarError);
      return NextResponse.json({ ok: false, error: limpiarError.message }, { status: 500 });
    }

    for (let i = 0; i < seleccionadas.length; i++) {
      const { error: setError } = await supabase
        .from("noticias")
        .update({ es_portada: true, orden_portada: i + 1 })
        .eq("id", seleccionadas[i].id);
      if (setError) {
        console.error("Error marcando noticia como portada:", setError);
        return NextResponse.json({ ok: false, error: setError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, seleccionadas });
  } catch (err) {
    console.error("Catch error in GET noticias/portada/auto-select:", err);
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
