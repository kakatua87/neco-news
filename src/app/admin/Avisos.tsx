"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "./_lib/adminFetch";
import { useToast } from "./_lib/toast";

type ItemEdicion = { titulo: string; seccion?: string; resultado?: string; motivo?: string };
type Aviso = {
  id: number;
  ts: string;
  tipo: string;
  titulo: string;
  leida: boolean;
  detalle: {
    publicadas?: number;
    para_revision?: number;
    errores?: number;
    items?: ItemEdicion[];
    error?: string;
  } | null;
};
type Respuesta = { items: Aviso[]; noLeidas: number };

const SONDEO_MS = 30_000;

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

const ETIQUETA: Record<string, { texto: string; cls: string }> = {
  publicada: { texto: "Publicada", cls: "text-emerald-700" },
  revision: { texto: "A Pendientes", cls: "text-amber-700" },
  aprobada_sombra: { texto: "Aprobada", cls: "text-emerald-700" },
  error: { texto: "Error de la IA", cls: "text-red-600" },
};

/** Campana del panel: avisa cuando termina de procesar y publicar con IA (matutina o botón), esté donde esté el editor. */
export default function Avisos() {
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<Respuesta>({ items: [], noLeidas: 0 });
  const [expandido, setExpandido] = useState<number | null>(null);
  const ultimoVisto = useRef<number | null>(null); // mayor id ya conocido: lo posterior es un aviso nuevo

  const cargar = useCallback(async () => {
    const r = await adminFetch<Respuesta>("/api/admin-avisos", { cache: "no-store" });
    if (!r.ok || !r.data) return;
    const d = r.data;
    const maxId = d.items.reduce((m, a) => Math.max(m, a.id), 0);
    if (ultimoVisto.current === null) {
      ultimoVisto.current = maxId; // primera lectura: no se anuncia lo que ya estaba
    } else if (maxId > ultimoVisto.current) {
      const nuevos = d.items.filter((a) => a.id > (ultimoVisto.current ?? 0)).reverse();
      for (const a of nuevos) toast(`🔔 ${a.titulo}`, a.tipo === "edicion" ? "ok" : "error");
      ultimoVisto.current = maxId;
    }
    setDatos(d);
  }, [toast]);

  useEffect(() => {
    const inicial = setTimeout(cargar, 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") cargar();
    }, SONDEO_MS);
    return () => {
      clearTimeout(inicial);
      clearInterval(id);
    };
  }, [cargar]);

  const marcarLeidas = async () => {
    setDatos((d) => ({ noLeidas: 0, items: d.items.map((a) => ({ ...a, leida: true })) }));
    await adminFetch("/api/admin-avisos", { method: "POST" });
  };

  const alternar = () => {
    const abrir = !abierto;
    setAbierto(abrir);
    if (abrir && datos.noLeidas > 0) marcarLeidas();
  };

  return (
    <div className="relative px-4">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center text-cream/70 hover:bg-cream/10 transition-colors"
      >
        <span>🔔 Avisos</span>
        {datos.noLeidas > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{datos.noLeidas}</span>
        )}
      </button>

      {abierto && (
        <div className="absolute left-4 right-4 md:left-full md:right-auto md:ml-2 md:w-96 top-full md:top-0 z-50 max-h-[70vh] overflow-y-auto rounded-xl bg-white text-ink shadow-2xl border border-border">
          <div className="sticky top-0 bg-white border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold">Avisos de la IA</span>
            <button type="button" onClick={() => setAbierto(false)} className="text-xs text-muted hover:text-ink">
              Cerrar
            </button>
          </div>
          {datos.items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted">
              Todavía no hay avisos. Cuando termine una edición (la de las 06:00 o la que dispares con el botón) aparece acá.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {datos.items.map((a) => {
                const mala = a.tipo === "error" || a.tipo === "edicion_aviso";
                const abierta = expandido === a.id;
                const items = a.detalle?.items ?? [];
                return (
                  <li key={a.id} className="px-4 py-3">
                    <button type="button" className="w-full text-left" onClick={() => setExpandido(abierta ? null : a.id)}>
                      <div className="flex items-start gap-2">
                        <span aria-hidden>{a.tipo === "error" ? "⚠️" : mala ? "🟡" : "✅"}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug">{a.titulo}</p>
                          <p className="text-[11px] text-muted">{cuando(a.ts)} hs</p>
                        </div>
                      </div>
                    </button>
                    {a.detalle?.error && <p className="mt-1 text-xs text-red-600">{a.detalle.error}</p>}
                    {abierta && items.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {items.map((it, i) => {
                          const e = ETIQUETA[it.resultado ?? ""] ?? { texto: it.resultado ?? "", cls: "text-muted" };
                          return (
                            <li key={i} className="text-xs leading-snug">
                              <span className={`font-bold ${e.cls}`}>{e.texto}</span>
                              {it.seccion ? <span className="text-muted"> · {it.seccion}</span> : null}
                              <div>{it.titulo}</div>
                              {it.resultado === "revision" && it.motivo ? (
                                <div className="text-[11px] text-muted">{it.motivo}</div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {(a.detalle?.para_revision ?? 0) > 0 && (
                      <Link href="/admin/pendientes" className="mt-2 inline-block text-xs font-bold text-accent" onClick={() => setAbierto(false)}>
                        Ver Pendientes ({a.detalle?.para_revision}) →
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
