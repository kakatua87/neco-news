import type { SupabaseClient } from "@supabase/supabase-js";

/** Horas sin ninguna corrida del scraper a partir de las cuales se considera detenido. */
export const UMBRAL_SCRAPING_HORAS = 8;

/** Horas desde la última corrida registrada en `fuentes_salud` (null si no hay ninguna). */
export async function horasDesdeUltimaCorrida(admin: SupabaseClient): Promise<number | null> {
  const { data } = await admin.from("fuentes_salud").select("ts").order("ts", { ascending: false }).limit(1);
  const ts = data?.[0]?.ts as string | undefined;
  return ts ? (Date.now() - new Date(ts).getTime()) / 3_600_000 : null;
}

/**
 * Deja un aviso en la campana si el scraping lleva más de UMBRAL_SCRAPING_HORAS sin correr. Se evalúa acá y no
 * en el scraper porque, si es el scraper el que se frena, no puede avisar él mismo. No repite el aviso mientras
 * haya uno de las últimas UMBRAL_SCRAPING_HORAS horas. Nunca lanza: la campana debe seguir funcionando.
 */
export async function vigilarScraping(admin: SupabaseClient): Promise<void> {
  try {
    const horas = await horasDesdeUltimaCorrida(admin);
    if (horas === null || horas < UMBRAL_SCRAPING_HORAS) return;
    const desde = new Date(Date.now() - UMBRAL_SCRAPING_HORAS * 3_600_000).toISOString();
    const { data: previos } = await admin
      .from("admin_notificaciones")
      .select("id")
      .eq("tipo", "scraping_detenido")
      .gte("ts", desde)
      .limit(1);
    if (previos && previos.length > 0) return;
    await admin.from("admin_notificaciones").insert({
      tipo: "scraping_detenido",
      titulo: `El scraping lleva ${Math.floor(horas)} horas sin correr`,
      detalle: { horas: Math.round(horas * 10) / 10, sugerencia: "Revisá las corridas en GitHub Actions (Scrape noticias) y la pestaña Monitor." },
    });
  } catch (err) {
    console.error("vigilarScraping:", err);
  }
}
