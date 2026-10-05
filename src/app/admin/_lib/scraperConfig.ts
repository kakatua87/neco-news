export type FuenteCustom = { key: string; label: string; url: string };

export type ScraperConfig = {
  activo: boolean;
  fuentes_activas: string[];
  fecha_inicio: string | null;
  fuentes_custom: FuenteCustom[];
};

export const FUENTES_SCRAPER: { key: string; label: string; domain: string }[] = [
  { key: "nden", label: "NDEN (Necochea Digital)", domain: "nden.com.ar" },
  { key: "diarionecochea", label: "Diario Necochea", domain: "diarionecochea.com" },
  { key: "diario4v", label: "Diario 4V", domain: "diario4v.com" },
  { key: "tsn", label: "TSN Necochea", domain: "tsnnecochea.com.ar" },
  { key: "diarionq", label: "Diario NQ", domain: "diarionq.com.ar" },
  { key: "elecos", label: "El Ecos", domain: "elecos.com.ar" },
];

/** Normaliza lo que devuelve la base (o el default si la fila no existe todavía). */
export function normalizarScraperConfig(data: Partial<Record<keyof ScraperConfig, unknown>> | null | undefined): ScraperConfig {
  return {
    activo: data ? !!data.activo : true,
    fuentes_activas: (data?.fuentes_activas as string[] | undefined) || FUENTES_SCRAPER.map((f) => f.key),
    fecha_inicio: (data?.fecha_inicio as string | null | undefined) || null,
    fuentes_custom: Array.isArray(data?.fuentes_custom) ? (data.fuentes_custom as FuenteCustom[]) : [],
  };
}
