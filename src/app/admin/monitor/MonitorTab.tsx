"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ErrorMonitor, FuenteMonitor, MonitorScraping } from "../_lib/monitor";

const REFRESCO_MS = 60_000;

function cuando(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function hace(horas: number | null): string {
  if (horas === null) return "sin corridas";
  if (horas < 1) return `hace ${Math.max(1, Math.round(horas * 60))} min`;
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `hace ${h} h${m ? ` ${m} min` : ""}`;
}

const NIVEL = {
  ok: { texto: "Scraping funcionando", cls: "bg-emerald-50 border-emerald-300 text-emerald-800", punto: "bg-emerald-500" },
  atencion: { texto: "Funciona, pero hay fuentes con problemas", cls: "bg-amber-50 border-amber-300 text-amber-800", punto: "bg-amber-500" },
  detenido: { texto: "Scraping detenido", cls: "bg-red-50 border-red-300 text-red-800", punto: "bg-red-500" },
} as const;

const ESTADO_FUENTE = {
  ok: { texto: "OK", punto: "bg-emerald-500" },
  atencion: { texto: "Atención", punto: "bg-amber-500" },
  caida: { texto: "Caída", punto: "bg-red-500" },
} as const;

const ORIGEN_ERROR: Record<ErrorMonitor["origen"], string> = {
  fuente: "Fuente",
  aviso: "Aviso",
  trabajo: "Trabajo de IA",
};

type FiltroError = "todos" | ErrorMonitor["origen"];

function TablaFuentes({ fuentes }: { fuentes: FuenteMonitor[] }) {
  return (
    <div className="overflow-x-auto border border-border rounded-xl bg-white">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Fuente</th>
            <th className="text-right px-3 py-2">Guardadas</th>
            <th className="text-right px-3 py-2">Nuevas</th>
            <th className="text-right px-3 py-2">Sin cuerpo</th>
            <th className="text-right px-3 py-2">Bloqueadas</th>
            <th className="text-right px-3 py-2">Viejas</th>
            <th className="text-right px-3 py-2">Con error</th>
            <th className="text-left px-3 py-2">Última nota</th>
            <th className="text-left px-3 py-2">Último error</th>
          </tr>
        </thead>
        <tbody>
          {fuentes.map((f) => (
            <tr key={f.fuente} className="border-t border-border/60 align-top">
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                <span className="inline-flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${ESTADO_FUENTE[f.estado].punto}`} title={ESTADO_FUENTE[f.estado].texto} />
                  {f.fuente}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{f.guardadas}</td>
              <td className="px-3 py-2 text-right">{f.nuevas}</td>
              <td className={`px-3 py-2 text-right ${f.sinCuerpo > 0 ? "text-amber-700 font-bold" : ""}`}>{f.sinCuerpo}</td>
              <td className={`px-3 py-2 text-right ${f.bloqueadas > 0 ? "text-red-600 font-bold" : ""}`}>{f.bloqueadas}</td>
              <td className="px-3 py-2 text-right">{f.viejas}</td>
              <td className={`px-3 py-2 text-right ${f.corridasConError > 0 ? "text-red-600 font-bold" : ""}`}>
                {f.corridasConError}/{f.corridas}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-muted">{f.ultimaNota ? cuando(f.ultimaNota) : "—"}</td>
              <td className="px-3 py-2 text-xs text-red-600">{f.ultimoError ?? ""}</td>
            </tr>
          ))}
          {fuentes.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-6 text-center text-muted">
                No hay corridas registradas en los últimos 7 días.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function MonitorTab({ datos }: { datos: MonitorScraping }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroError>("todos");

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESCO_MS);
    return () => clearInterval(id);
  }, [router]);

  const nivel = NIVEL[datos.nivel];
  const errores = filtro === "todos" ? datos.errores : datos.errores.filter((e) => e.origen === filtro);
  const conProblemas = datos.fuentes.filter((f) => f.estado !== "ok").length;

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">📡 Monitor del scraping</h2>
          <p className="text-sm text-muted mt-1">
            Estado de las corridas, de cada fuente y de los errores de los últimos 7 días. Se actualiza solo cada minuto.
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          ↻ Actualizar
        </button>
      </div>

      <section className={`border rounded-xl p-5 ${nivel.cls}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className={`w-3 h-3 rounded-full ${nivel.punto}`} />
          <h3 className="text-lg font-bold">{nivel.texto}</h3>
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="opacity-70">Última corrida</dt>
            <dd className="font-bold">
              {datos.ultimaCorrida ? cuando(datos.ultimaCorrida) : "—"} · {hace(datos.horasSinCorrer)}
            </dd>
          </div>
          <div>
            <dt className="opacity-70">Notas guardadas (24 h)</dt>
            <dd className="font-bold">{datos.guardadas24h}</dd>
          </div>
          <div>
            <dt className="opacity-70">Corridas (7 días)</dt>
            <dd className="font-bold">{datos.corridas7d}</dd>
          </div>
          <div>
            <dt className="opacity-70">Fuentes con problemas</dt>
            <dd className="font-bold">
              {conProblemas} de {datos.fuentes.length}
            </dd>
          </div>
        </dl>
        <p className="text-xs mt-3 opacity-80">
          Se considera detenido a partir de {datos.umbralHoras} h sin corrida. GitHub dispara el scraping cada 4 a 7 horas aunque esté
          programado cada 2: es normal y no indica un fallo.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-ink">Fuentes (últimos 7 días)</h3>
        <TablaFuentes fuentes={datos.fuentes} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <h3 className="text-lg font-bold text-ink">Errores recientes</h3>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar errores">
            {(["todos", "fuente", "aviso", "trabajo"] as FiltroError[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={filtro === k}
                onClick={() => setFiltro(k)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filtro === k ? "bg-accent text-white border-accent font-bold" : "bg-white text-muted border-border hover:bg-gray-50"
                }`}
              >
                {k === "todos" ? "Todos" : ORIGEN_ERROR[k]}
              </button>
            ))}
          </div>
        </div>

        {datos.erroresIA24h.length > 0 && (
          <p className="text-sm text-muted">
            Errores de la IA en las últimas 24 h:{" "}
            {datos.erroresIA24h.map((e) => (
              <span key={e.codigo} className="inline-block mr-2 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                {e.codigo} × {e.cantidad}
              </span>
            ))}
          </p>
        )}

        <div className="border border-border rounded-xl bg-white divide-y divide-border/60">
          {errores.map((e, i) => (
            <div key={`${e.ts}-${i}`} className="px-4 py-3 text-sm flex flex-col md:flex-row md:items-start gap-1 md:gap-4">
              <span className="text-xs text-muted whitespace-nowrap md:w-32 shrink-0">{cuando(e.ts)}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted md:w-28 shrink-0">{ORIGEN_ERROR[e.origen]}</span>
              <span className="flex-1 min-w-0">
                <span className="text-ink break-words">{e.titulo}</span>
                {e.detalle && <span className="block text-xs text-muted break-all mt-0.5">{e.detalle}</span>}
              </span>
            </div>
          ))}
          {errores.length === 0 && <div className="px-4 py-8 text-center text-muted">Sin errores en los últimos 7 días 🎉</div>}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-ink">Últimas corridas</h3>
        <div className="overflow-x-auto border border-border rounded-xl bg-white">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Corrida</th>
                <th className="text-right px-3 py-2">Fuentes</th>
                <th className="text-right px-3 py-2">Notas guardadas</th>
                <th className="text-right px-3 py-2">Con error</th>
              </tr>
            </thead>
            <tbody>
              {datos.corridas.map((c) => (
                <tr key={c.ts} className="border-t border-border/60">
                  <td className="px-3 py-2 whitespace-nowrap">{cuando(c.ts)}</td>
                  <td className="px-3 py-2 text-right">{c.fuentes}</td>
                  <td className="px-3 py-2 text-right">{c.guardadas}</td>
                  <td className={`px-3 py-2 text-right ${c.errores > 0 ? "text-red-600 font-bold" : ""}`}>{c.errores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
