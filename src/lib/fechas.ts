export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type GrupoDia<T> = { key: string; label: string; items: T[] };
export type GrupoMes<T> = { key: string; label: string; dias: GrupoDia<T>[] };

/** Agrupa por mes > día según `fecha_publicacion`. Los ítems sin fecha válida van a "Sin fecha". */
export function agruparPorMesYDia<T extends { fecha_publicacion?: string | null }>(items: T[]): GrupoMes<T>[] {
  const meses = new Map<string, { label: string; dias: Map<string, GrupoDia<T>> }>();
  for (const item of items) {
    const fecha = item.fecha_publicacion ? new Date(item.fecha_publicacion) : null;
    const valida = fecha !== null && !isNaN(fecha.getTime());

    const mesKey = valida ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}` : "sin-fecha";
    const mesLabel = valida ? `${capitalize(MESES[fecha.getMonth()])} ${fecha.getFullYear()}` : "Sin fecha";
    const diaKey = valida ? fecha.toISOString().slice(0, 10) : "sin-fecha";
    const diaLabel = valida
      ? `${capitalize(DIAS_SEMANA[fecha.getDay()])} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`
      : "Sin fecha";

    if (!meses.has(mesKey)) meses.set(mesKey, { label: mesLabel, dias: new Map() });
    const mes = meses.get(mesKey)!;
    if (!mes.dias.has(diaKey)) mes.dias.set(diaKey, { key: diaKey, label: diaLabel, items: [] });
    mes.dias.get(diaKey)!.items.push(item);
  }
  return Array.from(meses.entries()).map(([key, val]) => ({
    key,
    label: val.label,
    dias: Array.from(val.dias.values()),
  }));
}

/**
 * Inicio y fin del día de HOY en Argentina (UTC-3 fijo, sin horario de verano), en formato ISO con offset.
 * Hay que usarlo en vez de `toISOString()`: entre las 21 y las 24 h de Argentina, en UTC ya es el día siguiente.
 */
export function rangoDiaArgentina(ahora: Date = new Date()): { fecha: string; inicio: string; fin: string } {
  const fecha = ahora.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }); // YYYY-MM-DD
  return { fecha, inicio: `${fecha}T00:00:00-03:00`, fin: `${fecha}T23:59:59.999-03:00` };
}
