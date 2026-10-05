"use client";

import { FUENTES_SCRAPER, type ScraperConfig } from "../_lib/scraperConfig";

type Props = {
  config: ScraperConfig;
  guardando: boolean;
  onGuardar: (patch: Partial<ScraperConfig>) => void;
  onToggleFuente: (key: string) => void;
};

/** Panel desplegable "Control del scraper" de la bandeja. */
export default function ScraperControl({ config, guardando, onGuardar, onToggleFuente }: Props) {
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
