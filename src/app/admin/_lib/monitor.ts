import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UMBRAL_SCRAPING_HORAS } from "@/lib/vigilante-scraping";
import { estadoDeFuente, type SaludFuente } from "./data";

export type FuenteMonitor = {
  fuente: string;
  estado: SaludFuente["estado"];
  corridas: number;
  corridasConError: number;
  tarjetas: number;
  nuevas: number;
  guardadas: number;
  sinCuerpo: number;
  bloqueadas: number;
  viejas: number;
  ultimaCorrida: string;
  ultimaNota: string | null;
  ultimoError: string | null;
};

export type CorridaMonitor = { ts: string; fuentes: number; guardadas: number; errores: number };

export type ErrorMonitor = {
  ts: string;
  origen: "fuente" | "aviso" | "trabajo";
  titulo: string;
  detalle: string | null;
};

export type MonitorScraping = {
  ahoraISO: string;
  ultimaCorrida: string | null;
  horasSinCorrer: number | null;
  nivel: "ok" | "atencion" | "detenido";
  guardadas24h: number;
  corridas7d: number;
  fuentes: FuenteMonitor[];
  corridas: CorridaMonitor[];
  errores: ErrorMonitor[];
  erroresIA24h: Array<{ codigo: string; cantidad: number }>;
  umbralHoras: number;
};

const TIPOS_AVISO_ERROR = ["error", "fuente", "sin_procesar", "edicion_aviso", "scraping_detenido"];

type FilaSalud = {
  fuente: string;
  ts: string;
  tarjetas: number | null;
  nuevas: number | null;
  guardadas: number | null;
  sin_cuerpo: number | null;
  bloqueadas: number | null;
  viejas: number | null;
  error: string | null;
};

const suma = (filas: FilaSalud[], campo: keyof FilaSalud) =>
  filas.reduce((s, f) => s + (Number(f[campo]) || 0), 0);

/** Todo lo que muestra la pestaña Monitor: estado del scraping, fuentes, corridas y errores de los últimos 7 días. */
export async function getMonitorScraping(): Promise<MonitorScraping> {
  const admin = createSupabaseAdminClient();
  const ahora = Date.now();
  const desde7d = new Date(ahora - 7 * 24 * 3600 * 1000).toISOString();
  const desde24h = new Date(ahora - 24 * 3600 * 1000).toISOString();

  const [salud, avisos, trabajos, usoIA] = await Promise.all([
    admin
      .from("fuentes_salud")
      .select("fuente, ts, tarjetas, nuevas, guardadas, sin_cuerpo, bloqueadas, viejas, error")
      .gte("ts", desde7d)
      .order("ts", { ascending: false })
      .limit(2000),
    admin
      .from("admin_notificaciones")
      .select("ts, tipo, titulo, detalle")
      .in("tipo", TIPOS_AVISO_ERROR)
      .gte("ts", desde7d)
      .order("ts", { ascending: false })
      .limit(60),
    admin
      .from("trabajos_ia")
      .select("inicio, origen, grupo_id, estado, error")
      .in("estado", ["error", "interrumpido"])
      .gte("inicio", desde7d)
      .order("inicio", { ascending: false })
      .limit(40),
    admin.from("llm_uso").select("codigo").eq("ok", false).gte("ts", desde24h).limit(2000),
  ]);

  const filas = (salud.data ?? []) as FilaSalud[];

  const porFuente = new Map<string, FilaSalud[]>();
  for (const f of filas) porFuente.set(f.fuente, [...(porFuente.get(f.fuente) ?? []), f]);
  const fuentes: FuenteMonitor[] = Array.from(porFuente.entries())
    .map(([fuente, fs]) => {
      const { ultima, conNotas, estado } = estadoDeFuente(fs);
      return {
        fuente,
        estado,
        corridas: fs.length,
        corridasConError: fs.filter((f) => f.error).length,
        tarjetas: ultima.tarjetas ?? 0,
        nuevas: suma(fs, "nuevas"),
        guardadas: suma(fs, "guardadas"),
        sinCuerpo: suma(fs, "sin_cuerpo"),
        bloqueadas: suma(fs, "bloqueadas"),
        viejas: suma(fs, "viejas"),
        ultimaCorrida: ultima.ts,
        ultimaNota: conNotas?.ts ?? null,
        ultimoError: fs.find((f) => f.error)?.error ?? null,
      };
    })
    .sort((a, b) => {
      const peso = { caida: 0, atencion: 1, ok: 2 } as const;
      return peso[a.estado] - peso[b.estado] || a.fuente.localeCompare(b.fuente);
    });

  const porCorrida = new Map<string, CorridaMonitor>();
  for (const f of filas) {
    const c = porCorrida.get(f.ts) ?? { ts: f.ts, fuentes: 0, guardadas: 0, errores: 0 };
    c.fuentes += 1;
    c.guardadas += f.guardadas ?? 0;
    if (f.error) c.errores += 1;
    porCorrida.set(f.ts, c);
  }
  const corridas = Array.from(porCorrida.values()).sort((a, b) => b.ts.localeCompare(a.ts));

  const errores: ErrorMonitor[] = [
    ...filas
      .filter((f) => f.error)
      .map((f) => ({ ts: f.ts, origen: "fuente" as const, titulo: `${f.fuente}: ${f.error}`, detalle: null })),
    ...(avisos.data ?? []).map((a) => ({
      ts: a.ts as string,
      origen: "aviso" as const,
      titulo: a.titulo as string,
      detalle: a.detalle ? JSON.stringify(a.detalle).slice(0, 240) : null,
    })),
    ...(trabajos.data ?? []).map((t) => ({
      ts: t.inicio as string,
      origen: "trabajo" as const,
      titulo: `Trabajo de IA ${t.estado === "interrumpido" ? "interrumpido" : "con error"} (${t.origen})`,
      detalle: (t.error as string | null) ?? null,
    })),
  ]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 80);

  const porCodigo = new Map<string, number>();
  for (const r of usoIA.data ?? []) {
    const codigo = String(r.codigo ?? "sin código");
    porCodigo.set(codigo, (porCodigo.get(codigo) ?? 0) + 1);
  }

  const ultimaCorrida = corridas[0]?.ts ?? null;
  const horasSinCorrer = ultimaCorrida ? (ahora - new Date(ultimaCorrida).getTime()) / 3_600_000 : null;
  const nivel =
    horasSinCorrer === null || horasSinCorrer >= UMBRAL_SCRAPING_HORAS
      ? "detenido"
      : fuentes.some((f) => f.estado !== "ok")
        ? "atencion"
        : "ok";

  return {
    ahoraISO: new Date(ahora).toISOString(),
    ultimaCorrida,
    horasSinCorrer,
    nivel,
    guardadas24h: filas.filter((f) => f.ts >= desde24h).reduce((s, f) => s + (f.guardadas ?? 0), 0),
    corridas7d: corridas.length,
    fuentes,
    corridas: corridas.slice(0, 30),
    errores,
    erroresIA24h: Array.from(porCodigo.entries())
      .map(([codigo, cantidad]) => ({ codigo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    umbralHoras: UMBRAL_SCRAPING_HORAS,
  };
}
