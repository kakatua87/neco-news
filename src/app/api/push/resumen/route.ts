import { NextResponse } from "next/server";
import { tieneSecretoInterno } from "@/lib/auth";
import { enviarPushNotification } from "@/lib/push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { seccionSlug } from "@/lib/secciones";

type Body = { ids?: Array<string | number> };

const MAX_IDS = 20;

/**
 * Push único de la edición matutina automática: en lugar de una notificación por nota publicada
 * (hasta 8 seguidas a todos los suscriptores) se manda una sola con la nota principal.
 * Solo el scraper la llama, con el secreto interno. Las notas se leen de la base y solo cuentan
 * las que están realmente publicadas.
 */
export async function POST(request: Request) {
  try {
    if (!tieneSecretoInterno(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const ids = Array.isArray(body.ids) ? body.ids.slice(0, MAX_IDS) : [];
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "ids es requerido" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("noticias")
      .select("id, titulo, slug, seccion, imagen_url, estado")
      .in("id", ids)
      .eq("estado", "publicada");
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // La principal es la primera de la lista (la edición las manda en el orden en que las eligió).
    const porId = new Map((data ?? []).map((n) => [String(n.id), n]));
    const publicadas = ids.map((id) => porId.get(String(id))).filter((n): n is NonNullable<typeof n> => Boolean(n));
    if (publicadas.length === 0) {
      return NextResponse.json({ ok: true, enviado: false, motivo: "ninguna publicada" });
    }

    const principal = publicadas[0];
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://necobeat.com.ar";
    const resto = publicadas.length - 1;
    const cuerpo =
      resto === 0 ? principal.titulo : `${publicadas.length} notas nuevas: ${principal.titulo}`;

    const resultado = await enviarPushNotification({
      titulo: "Edición de la mañana",
      cuerpo_corto: cuerpo,
      url: `${baseUrl}/${seccionSlug(principal.seccion)}/${principal.slug}`,
      imagen_url: principal.imagen_url ?? undefined,
    });

    if (!resultado.ok) {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, enviado: true, notas: publicadas.length, id: resultado.id });
  } catch (err: unknown) {
    console.error("Catch error in POST push/resumen:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}
