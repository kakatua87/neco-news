"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";

export type ItemManual = { grupo_id: string; fuentes_ids: (string | number)[] };

export type ResumenManual = {
  ok?: boolean;
  error?: string;
  omitida?: string;
  procesadas?: number;
  publicadas?: number;
  para_revision?: number;
  errores?: number;
  cortada_por_tiempo?: boolean;
  items?: { grupo_id: string; resultado: string }[];
};

type EstadoEdicion = {
  en_curso: boolean;
  ultima_manual: { resumen?: ResumenManual; inicio?: string; fin?: string } | null;
};

type Props = {
  /** Cantidad de grupos de la bandeja creados hoy (día argentino). */
  gruposHoy: number;
  /** Ids de los grupos tildados con "Incluir". */
  seleccionados: string[];
  /** Arma los items (fuentes y sección elegidas en cada tarjeta) de los grupos tildados. */
  armarItems: () => ItemManual[];
  /** Se llama al terminar una corrida manual, con su resumen, para refrescar la bandeja. */
  onTerminado: (resumen: ResumenManual | null) => void;
};

const SONDEO_MS = 5000;

function textoResumen(r: ResumenManual | null): string {
  if (!r) return "La edición terminó.";
  if (r.ok === false) return `La edición manual falló: ${r.error ?? "error desconocido"}`;
  if (r.omitida) return "No había grupos para procesar.";
  const partes = [
    `${r.publicadas ?? 0} publicada${(r.publicadas ?? 0) !== 1 ? "s" : ""}`,
    `${r.para_revision ?? 0} a Pendientes`,
  ];
  if (r.errores) partes.push(`${r.errores} con error de la IA`);
  if (r.cortada_por_tiempo) partes.push("cortada por tiempo");
  return `Edición manual terminada: ${partes.join(" · ")}.`;
}

/** Botones "Publicar con IA" de la Bandeja: dispara el publicador automático del scraper a pedido. */
export default function PublicarConIA({ gruposHoy, seleccionados, armarItems, onTerminado }: Props) {
  const toast = useToast();
  const [procesando, setProcesando] = useState(false);
  const [tope, setTope] = useState("4");
  const lanzadoEn = useRef(0);
  const finalizando = useRef(false);

  const terminar = useCallback(
    (estado: EstadoEdicion) => {
      if (finalizando.current) return;
      finalizando.current = true;
      const ultima = estado.ultima_manual;
      const esDeEsteClick = ultima?.fin && new Date(ultima.fin).getTime() >= lanzadoEn.current - 60_000;
      const resumen = esDeEsteClick ? (ultima?.resumen ?? null) : null;
      toast(textoResumen(resumen), resumen?.ok === false ? "error" : "ok");
      setProcesando(false);
      onTerminado(resumen);
    },
    [toast, onTerminado]
  );

  // Al abrir la Bandeja, si ya hay una edición corriendo (la matutina o un click anterior), se muestra el estado.
  useEffect(() => {
    let vivo = true;
    adminFetch<EstadoEdicion>("/api/edicion/estado").then((r) => {
      if (vivo && r.ok && r.data?.en_curso) {
        finalizando.current = false;
        setProcesando(true);
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!procesando) return;
    const id = setInterval(async () => {
      const r = await adminFetch<EstadoEdicion>("/api/edicion/estado");
      if (r.ok && r.data && !r.data.en_curso) terminar(r.data);
    }, SONDEO_MS);
    return () => clearInterval(id);
  }, [procesando, terminar]);

  const disparar = async (cuerpo: Record<string, unknown>, cantidad: number, cual: string) => {
    const aviso =
      `⚡ Vas a publicar con IA ${cual}.\n\n` +
      `Se redactan, pasan el control de imagen y el verificador de hechos, y las aprobadas SE PUBLICAN SIN REVISIÓN PREVIA ` +
      `(las que no pasan quedan en Pendientes). Máximo ${cantidad} nota${cantidad !== 1 ? "s" : ""}.\n\n¿Continuar?`;
    if (!confirm(aviso)) return;

    finalizando.current = false;
    lanzadoEn.current = Date.now();
    setProcesando(true);
    const r = await adminFetch("/api/edicion/manual", { method: "POST", json: cuerpo });
    if (!r.ok) {
      toast(`No se pudo iniciar: ${r.error}`);
      setProcesando(false);
      return;
    }
    toast("Edición manual iniciada. Puede tardar varios minutos; podés seguir trabajando.", "ok");
  };

  const topeNum = Math.max(1, Math.min(20, Math.floor(Number(tope)) || 4));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-4 py-3">
      <span className="text-sm font-bold text-ink">⚡ Publicar con IA</span>

      <label className="flex items-center gap-1 text-xs text-muted">
        Máx.
        <input
          type="number"
          min={1}
          max={20}
          value={tope}
          onChange={(e) => setTope(e.target.value)}
          disabled={procesando}
          className="w-14 rounded-lg border border-border px-2 py-1 text-sm text-ink"
        />
      </label>

      <button
        type="button"
        disabled={procesando || gruposHoy === 0}
        onClick={() => disparar({ solo_hoy: true, tope: topeNum }, topeNum, `hasta ${topeNum} de las notas de hoy`)}
        className="rounded-full bg-ink px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {procesando ? "Procesando…" : `Publicar las de hoy (${gruposHoy})`}
      </button>

      {seleccionados.length > 0 && (
        <button
          type="button"
          disabled={procesando}
          onClick={() =>
            disparar(
              { items: armarItems() },
              seleccionados.length,
              `${seleccionados.length} grupo${seleccionados.length !== 1 ? "s" : ""} seleccionado${seleccionados.length !== 1 ? "s" : ""}`
            )
          }
          className="rounded-full border border-ink px-4 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Publicar {seleccionados.length} seleccionado{seleccionados.length !== 1 ? "s" : ""}
        </button>
      )}

      <span className="ml-auto text-[11px] text-muted">
        {procesando
          ? "Hay una edición en curso. Te aviso cuando termine."
          : "No usa el cupo de la mañana. Marcá “Incluir” en los grupos que quieras."}
      </span>
    </div>
  );
}
