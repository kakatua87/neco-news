import type { Noticia } from "@/types/noticia";
import { MESES, capitalize } from "@/lib/fechas";

export type GrupoRaw = { grupoId: string; notas: Noticia[] };

const TZ = "America/Argentina/Buenos_Aires";

/**
 * Agrupa los grupos de la bandeja por día. Ambas fechas (la clave ISO para la API y la
 * etiqueta para mostrar) salen del mismo Date con la MISMA zona horaria (Argentina);
 * si no, cerca de medianoche UTC podían quedar dos cabeceras para el mismo día.
 * La clave devuelta es `${YYYY-MM-DD}||${etiqueta}`.
 */
export function agruparPorFecha(
  rawGrupos: Record<string, Noticia[]>,
  filtroSeccion: string
): { gruposPorFecha: Record<string, GrupoRaw[]>; fechasOrdenadas: string[] } {
  const gruposPorFecha: Record<string, GrupoRaw[]> = {};
  for (const [grupoId, notas] of Object.entries(rawGrupos)) {
    if (!notas.length) continue;
    const seccionGrupo = notas[0]?.seccion || "Local";
    if (filtroSeccion !== "Todas" && seccionGrupo !== filtroSeccion) continue;

    const fecha = new Date(notas[0].created_at);
    const etiqueta = fecha.toLocaleDateString("es-AR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: TZ,
    });
    const iso = fecha.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
    const key = `${iso}||${etiqueta}`;
    (gruposPorFecha[key] ??= []).push({ grupoId, notas });
  }
  const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a, b) => b.localeCompare(a));
  return { gruposPorFecha, fechasOrdenadas };
}

/** Agrupa las claves de día por mes para el desplegable mes > día. */
export function agruparDiasPorMes(fechasOrdenadas: string[]) {
  const meses: { key: string; label: string; fechaKeys: string[] }[] = [];
  for (const fechaKey of fechasOrdenadas) {
    const [isoDate] = fechaKey.split("||");
    const [anio, mes] = isoDate.split("-");
    const key = `${anio}-${mes}`;
    let grupoMes = meses.find((m) => m.key === key);
    if (!grupoMes) {
      grupoMes = { key, label: `${capitalize(MESES[Number(mes) - 1])} ${anio}`, fechaKeys: [] };
      meses.push(grupoMes);
    }
    grupoMes.fechaKeys.push(fechaKey);
  }
  return meses;
}

/** Dentro de un día, agrupa los grupos por sitio de origen (los más numerosos primero). */
export function agruparPorSitio(gruposDelDia: GrupoRaw[]) {
  const porSitio: Record<string, GrupoRaw[]> = {};
  for (const g of gruposDelDia) {
    const fuentes = new Set(g.notas.map((n) => n.fuente || "Sin fuente"));
    const sitio = fuentes.size > 1 ? "Varias fuentes" : g.notas[0]?.fuente || "Sin fuente";
    (porSitio[sitio] ??= []).push(g);
  }
  const sitiosOrdenados = Object.keys(porSitio).sort((a, b) => porSitio[b].length - porSitio[a].length);
  return { porSitio, sitiosOrdenados };
}

// ── Sugerencias de fusión: notas de otro sitio que podrían ser la misma historia ──
// El scraper ya agrupa por similitud de título server-side; esto es solo una ayuda
// visual más simple para los casos que ese algoritmo no detectó (fechas cercanas,
// fuentes distintas): el humano confirma con un click.
const UMBRAL_SIMILITUD_FUSION = 0.6;
const VENTANA_FUSION_MS = 36 * 60 * 60 * 1000;

const normalizarTitulo = (t: string): string[] =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

const similitudTitulos = (a: string, b: string): number => {
  const wa = new Set(normalizarTitulo(a));
  const wb = new Set(normalizarTitulo(b));
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / Math.min(wa.size, wb.size);
};

export type SugerenciaFusion = { grupoId: string; fuente: string; score: number };

export function calcularSugerenciasFusion(rawGrupos: Record<string, Noticia[]>): Record<string, SugerenciaFusion> {
  const grupos = Object.entries(rawGrupos)
    .filter(([, notas]) => notas.length > 0)
    .map(([grupoId, notas]) => ({
      grupoId,
      notas,
      titulo: notas[0].titulo_original || notas[0].titulo,
      fecha: new Date(notas[0].created_at).getTime(),
      fuentes: new Set(notas.map((n) => n.fuente || "Sin fuente")),
    }));

  const sugerencias: Record<string, SugerenciaFusion> = {};
  for (const a of grupos) {
    let mejor: SugerenciaFusion | null = null;
    for (const b of grupos) {
      if (a.grupoId === b.grupoId) continue;
      // Si ya comparten alguna fuente, el scraper ya los agrupó bien.
      let comparten = false;
      b.fuentes.forEach((f) => { if (a.fuentes.has(f)) comparten = true; });
      if (comparten) continue;
      if (Math.abs(a.fecha - b.fecha) > VENTANA_FUSION_MS) continue;
      const score = similitudTitulos(a.titulo, b.titulo);
      if (score >= UMBRAL_SIMILITUD_FUSION && (!mejor || score > mejor.score)) {
        mejor = { grupoId: b.grupoId, fuente: b.notas[0]?.fuente || "otra fuente", score };
      }
    }
    if (mejor) sugerencias[a.grupoId] = mejor;
  }
  return sugerencias;
}
