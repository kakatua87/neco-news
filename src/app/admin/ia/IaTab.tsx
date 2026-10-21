"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import type { BarraModelo, BarraProyecto, Capacidad, ConsumoNotas, IaLimites } from "./calculos";

type Props = {
  ahoraISO: string;
  barras: BarraProyecto[];
  consumo: ConsumoNotas;
  capacidad: Capacidad;
  limites: IaLimites;
  totalFilas: number;
};

const fmt = (n: number) => Math.round(n).toLocaleString("es-AR");
const fmt1 = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });

const NOMBRES_PROPOSITO: Record<string, string> = {
  redaccion: "Redacción",
  imagen: "Control de imagen",
  hechos: "Verificador de hechos",
  clasificador: "Clasificador de secciones",
  recorte: "Ubicar logo (recorte)",
  respaldo: "Respaldo",
  otro: "Otros",
};

function colorBarra(pct: number): string {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 65) return "bg-amber-500";
  return "bg-emerald-500";
}

function horaART(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function cuentaRegresiva(destinoISO: string, ahora: number): string {
  const min = Math.max(0, Math.round((new Date(destinoISO).getTime() - ahora) / 60000));
  const h = Math.floor(min / 60);
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
}

function Barra({ usado, limite, etiqueta }: { usado: number; limite: number | null; etiqueta: string }) {
  if (limite == null || limite <= 0) {
    return (
      <div className="text-xs text-muted">
        {etiqueta}: <b className="text-ink">{fmt(usado)}</b> usadas · límite sin cargar
      </div>
    );
  }
  const pct = Math.min(100, (usado / limite) * 100);
  const restante = Math.max(0, limite - usado);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted">{etiqueta}</span>
        <span>
          <b className="text-ink">{fmt(usado)}</b> / {fmt(limite)} · quedan <b className="text-ink">{fmt(restante)}</b>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full ${colorBarra(pct)} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FilaModelo({ m, esGemini }: { m: BarraModelo; esGemini: boolean }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink">{m.modelo}</span>
        {m.agotadaAhora && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">429 en la última hora</span>
        )}
        {m.limiteRpm != null && <span className="text-[11px] text-muted">{m.limiteRpm} por minuto</span>}
      </div>
      <Barra usado={m.solicitudes} limite={m.limiteRpd} etiqueta="Solicitudes de hoy" />
      {m.restanteReal && m.restanteReal.solicitudes != null && (
        <div className="text-[11px] text-emerald-700">
          Dato real de Groq: quedan {fmt(m.restanteReal.solicitudes)} solicitudes
          {m.restanteReal.reinicio ? ` (se reinicia en ${m.restanteReal.reinicio})` : ""}
        </div>
      )}
      {!esGemini && m.limiteTpd != null && <Barra usado={m.tokens} limite={m.limiteTpd} etiqueta="Tokens de hoy" />}
      <div className="flex flex-wrap gap-x-4 text-[11px] text-muted">
        <span>Tokens hoy: {fmt(m.tokens)}</span>
        {m.errores429 > 0 && <span>429 (sin cupo): {m.errores429}</span>}
        {m.otrosErrores > 0 && <span>Otros errores (503, timeouts): {m.otrosErrores}</span>}
      </div>
    </div>
  );
}

export default function IaTab({ ahoraISO, barras, consumo, capacidad, limites, totalFilas }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [ahora, setAhora] = useState(() => new Date(ahoraISO).getTime());
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modelos, setModelos] = useState(() =>
    Object.entries(limites.modelos).map(([nombre, l]) => ({
      nombre,
      rpm: l.rpm ?? "",
      rpd: l.rpd ?? "",
      tpm: l.tpm ?? "",
      tpd: l.tpd ?? "",
    }))
  );
  const [keys, setKeys] = useState(() => Object.entries(limites.keys).map(([sufijo, proyecto]) => ({ sufijo, proyecto })));

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const guardar = async () => {
    setGuardando(true);
    const body = {
      modelos: Object.fromEntries(
        modelos
          .filter((m) => m.nombre.trim())
          .map((m) => [m.nombre.trim(), { rpm: m.rpm, rpd: m.rpd, tpm: m.tpm, tpd: m.tpd }])
      ),
      keys: Object.fromEntries(keys.filter((k) => k.sufijo.trim() && k.proyecto.trim()).map((k) => [k.sufijo, k.proyecto])),
    };
    const r = await adminFetch("/api/ia/limites", { method: "PATCH", json: body });
    setGuardando(false);
    if (!r.ok) {
      toast(`No se pudo guardar: ${r.error}`);
      return;
    }
    toast("Límites guardados.", "ok");
    setEditando(false);
    router.refresh();
  };

  const gemini = barras.filter((b) => b.proveedor === "gemini");
  const otros = barras.filter((b) => b.proveedor !== "gemini");
  const reinicio = gemini[0]?.reinicioISO ?? null;
  const input = "w-20 rounded border border-border px-2 py-1 text-xs";

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-ink">🔋 Uso de IA</h2>
        <p className="mt-1 text-sm text-muted">
          Solicitudes y tokens que consume la automatización, por proyecto de Google y modelo. Los límites del nivel gratuito
          se cuentan en <b>solicitudes por día</b>: ese es el tope que manda, más que los tokens.
        </p>
      </div>

      {/* ── Capacidad ── */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Con lo que queda hoy</p>
            {capacidad.notasRestantes == null ? (
              <p className="mt-1 text-lg font-bold text-ink">Cargá los límites para calcular cuántas notas más se pueden publicar.</p>
            ) : (
              <p className="mt-1 text-3xl font-extrabold text-ink">
                ≈ {fmt(capacidad.notasRestantes)} <span className="text-base font-bold text-muted">notas más</span>
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              {fmt(capacidad.solicitudesRestantes)} solicitudes disponibles ÷ {fmt1(capacidad.porNota)} por nota
              {capacidad.estimadoInicial ? " (estimación inicial: aún hay pocos datos propios)" : " (promedio real)"}.
              {capacidad.limitante ? ` Lo que más se acerca al tope: ${capacidad.limitante}.` : ""}
            </p>
          </div>
          {reinicio && (
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Se renueva</p>
              <p className="mt-1 text-xl font-bold text-ink">en {cuentaRegresiva(reinicio, ahora)}</p>
              <p className="text-xs text-muted">a las {horaART(reinicio)} hs (medianoche del Pacífico)</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Gemini por proyecto ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink">Gemini · por proyecto de Google</h3>
        <p className="text-xs text-muted">
          Las keys del mismo proyecto comparten la cuota. Google no informa lo que queda: lo disponible es una estimación con
          lo que registra el scraper y los límites cargados abajo. La cuota por minuto se repone sola cada minuto.
        </p>
        {gemini.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-6 text-sm text-muted">
            Todavía no hay uso registrado ni keys asignadas a un proyecto.
          </div>
        )}
        {gemini.map((p) => (
          <div key={p.proyecto} className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-ink">{p.proyecto}</h4>
                <p className="text-[11px] text-muted">Keys: {p.keys.length ? p.keys.join(" · ") : "—"}</p>
              </div>
              {p.reinicioISO && (
                <span className="text-[11px] text-muted">Renueva en {cuentaRegresiva(p.reinicioISO, ahora)}</span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {p.modelos.map((m) => (
                <FilaModelo key={m.modelo} m={m} esGemini />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Respaldos ── */}
      {otros.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-ink">Respaldos (Groq y Claude)</h3>
          {otros.map((p) => (
            <div key={p.proyecto} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <h4 className="mb-3 font-bold text-ink">{p.proyecto}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {p.modelos.map((m) => (
                  <FilaModelo key={m.modelo} m={m} esGemini={false} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Consumo por nota ── */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold text-ink">Consumo por nota publicada</h3>
        {consumo.notas === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Todavía no hay notas publicadas con consumo registrado (el registro empieza con la próxima edición).
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">Últimos 8 días · {consumo.notas} nota{consumo.notas !== 1 ? "s" : ""}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["Solicitudes por nota", fmt1(consumo.solicitudesPromedio)],
                ["Tokens por nota (prom.)", fmt(consumo.tokensPromedio)],
                ["Mínimo", fmt(consumo.tokensMin)],
                ["Máximo", fmt(consumo.tokensMax)],
              ].map(([t, v]) => (
                <div key={t} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[11px] text-muted">{t}</p>
                  <p className="text-xl font-extrabold text-ink">{v}</p>
                </div>
              ))}
            </div>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="py-2">Para qué</th>
                  <th className="py-2">Solicitudes / nota</th>
                  <th className="py-2">Tokens / nota</th>
                </tr>
              </thead>
              <tbody>
                {consumo.porProposito.map((p) => (
                  <tr key={p.proposito} className="border-b border-border/60">
                    <td className="py-2">{NOMBRES_PROPOSITO[p.proposito] ?? p.proposito}</td>
                    <td className="py-2">{fmt1(p.solicitudes)}</td>
                    <td className="py-2">{fmt(p.tokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Límites ── */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">Límites y proyectos</h3>
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            {editando ? "Cerrar" : "Editar"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Valores de Google AI Studio → Límite de frecuencia (nivel gratuito). Se guardan acá y las barras se recalculan.
        </p>
        {editando && (
          <div className="mt-4 space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="py-1">Modelo</th>
                    <th>Por minuto</th>
                    <th>Por día</th>
                    <th>Tokens/min</th>
                    <th>Tokens/día</th>
                  </tr>
                </thead>
                <tbody>
                  {modelos.map((m, i) => (
                    <tr key={i}>
                      <td className="py-1 pr-2">
                        <input
                          value={m.nombre}
                          onChange={(e) => setModelos((p) => p.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                          className="w-56 rounded border border-border px-2 py-1"
                        />
                      </td>
                      {(["rpm", "rpd", "tpm", "tpd"] as const).map((c) => (
                        <td key={c} className="pr-2">
                          <input
                            type="number"
                            min={0}
                            value={m[c]}
                            onChange={(e) =>
                              setModelos((p) => p.map((x, j) => (j === i ? { ...x, [c]: e.target.value } : x)))
                            }
                            className={input}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => setModelos((p) => [...p, { nombre: "", rpm: "", rpd: "", tpm: "", tpd: "" }])}
                className="mt-2 text-xs font-bold text-accent"
              >
                + Agregar modelo
              </button>
            </div>

            <div>
              <p className="mb-1 text-xs font-bold text-ink">Keys de Gemini → proyecto de Google</p>
              <p className="mb-2 text-[11px] text-muted">
                Poné los últimos 4 caracteres de cada key y el id del proyecto (ej. gen-lang-client-0108631742). Las keys del
                mismo proyecto comparten cuota.
              </p>
              {keys.map((k, i) => (
                <div key={i} className="mb-1 flex gap-2">
                  <input
                    value={k.sufijo}
                    maxLength={8}
                    onChange={(e) => setKeys((p) => p.map((x, j) => (j === i ? { ...x, sufijo: e.target.value } : x)))}
                    placeholder="…JcNg"
                    className="w-24 rounded border border-border px-2 py-1 text-xs"
                  />
                  <input
                    value={k.proyecto}
                    onChange={(e) => setKeys((p) => p.map((x, j) => (j === i ? { ...x, proyecto: e.target.value } : x)))}
                    placeholder="proyecto"
                    className="w-72 rounded border border-border px-2 py-1 text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setKeys((p) => [...p, { sufijo: "", proyecto: "" }])}
                className="mt-1 text-xs font-bold text-accent"
              >
                + Agregar key
              </button>
            </div>

            <button
              type="button"
              disabled={guardando}
              onClick={guardar}
              className="rounded-full bg-ink px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar límites"}
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted">{fmt(totalFilas)} llamadas registradas en los últimos 8 días.</p>
    </div>
  );
}
