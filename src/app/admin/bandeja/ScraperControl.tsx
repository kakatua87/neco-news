"use client";

import type { SaludFuente } from "../_lib/data";
import { FUENTES_SCRAPER, type ScraperConfig } from "../_lib/scraperConfig";

type Props = {
  config: ScraperConfig;
  guardando: boolean;
  onGuardar: (patch: Partial<ScraperConfig>) => void;
  onToggleFuente: (key: string) => void;
  salud?: SaludFuente[];
};

const COLOR_ESTADO = { ok: "bg-green-500", atencion: "bg-amber-400", caida: "bg-red-500" } as const;

/** Panel desplegable "Control del scraper" de la bandeja. */
export default function ScraperControl({ config, guardando, onGuardar, onToggleFuente, salud = [] }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5 mb-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="font-bold text-ink">Control del Scraper</h3>
          <p className="text-xs text-muted mt-1">
            Elegí qué fuentes scrapear y desde cuándo. Podés detenerlo o dejarlo automático.
          </p>
        </div>
        <button
          onClick={() => onGuardar({ activo: !config.activo })}
          disabled={guardando}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
            config.activo ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#25D366] text-white hover:bg-[#1da64f]"
          }`}
        >
          {config.activo ? "⏸ Detener scraper" : "▶ Activar scraper"}
        </button>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Fuentes activas</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {FUENTES_SCRAPER.map((f) => (
            <label key={f.key} className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
              <input
                type="checkbox"
                checked={config.fuentes_activas.includes(f.key)}
                onChange={() => onToggleFuente(f.key)}
                className="w-4 h-4 accent-accent"
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {salud.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Salud de las fuentes (últimos 7 días)</p>
          <div className="space-y-1.5">
            {salud.map((f) => (
              <div key={f.fuente} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${COLOR_ESTADO[f.estado]}`} title={f.estado} />
                <span className="font-bold text-ink">{f.fuente}</span>
                <span className="text-xs text-muted">
                  {f.guardadas7d} notas en 7 días · última{" "}
                  {f.ultimaNota ? new Date(f.ultimaNota).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca"}
                </span>
                {f.estado === "caida" && f.bloqueadas >= 2 && (
                  <span className="text-xs font-bold text-red-600">Bloquea las notas (403): se reintenta cada 6 h</span>
                )}
                {f.error && <span className="text-xs text-amber-700">{f.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
          Arrancar automáticamente a partir de (dejar vacío para ya mismo)
        </p>
        <div className="flex items-center gap-3">
          <input
            type="datetime-local"
            value={config.fecha_inicio ? config.fecha_inicio.slice(0, 16) : ""}
            onChange={(e) => onGuardar({ fecha_inicio: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
          />
          {config.fecha_inicio && (
            <button onClick={() => onGuardar({ fecha_inicio: null })} className="text-xs text-muted hover:text-ink underline">
              Quitar fecha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
