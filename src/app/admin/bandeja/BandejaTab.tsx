"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Noticia } from "@/types/noticia";
import type { SaludFuente } from "../_lib/data";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useToggleSet } from "../_lib/useToggleSet";
import { useScraperConfig } from "../_lib/useScraperConfig";
import type { ScraperConfig } from "../_lib/scraperConfig";
import GrupoCard, { type AiProvider, type GrupoEditState } from "./GrupoCard";
import ScraperControl from "./ScraperControl";
import PublicarConIA, { type ItemManual } from "./PublicarConIA";
import AvisoLimite from "../_lib/AvisoLimite";
import EnviosBandeja from "./EnviosBandeja";
import { ESTADOS_ACTIVOS, type Envio } from "../_lib/envios";
import {
  FILTROS_INICIALES,
  agruparDiasPorMes,
  agruparPorFecha,
  agruparPorSitio,
  calcularSugerenciasFusion,
  contarPor,
  filtrarGrupos,
  prioridadGrupo,
  seccionPrevistaGrupo,
  sitiosGrupo,
  type FiltroPrioridad,
  type FiltrosBandeja,
} from "./agrupar";

type Props = {
  initialRawGrupos: Record<string, Noticia[]>;
  scraperConfig: ScraperConfig;
  notasMostradas: number;
  notasTotal: number;
  initialEnvios: Envio[];
  saludFuentes?: SaludFuente[];
  origenInicial?: Origen;
};

type Origen = "todos" | "scraper" | "ciudadano";

function estadoInicial(rawGrupos: Record<string, Noticia[]>): Record<string, GrupoEditState> {
  const estados: Record<string, GrupoEditState> = {};
  for (const [gid, notas] of Object.entries(rawGrupos)) {
    const conImagen = notas.find((n) => n.imagen_url);
    estados[gid] = {
      seleccionadas: new Set(notas.map((n) => n.id)),
      imagenId: conImagen?.id ?? null,
    };
  }
  return estados;
}

const PRIORIDADES: [FiltroPrioridad, string][] = [
  ["visibles", "Sin descartables"],
  ["prioritarias", "Prioritarias"],
  ["otras", "Otras"],
  ["descartables", "Descartables"],
  ["todas", "Todas"],
];

function FilaFiltro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-[11px] font-bold uppercase tracking-wide text-muted">{titulo}</span>
      {children}
    </div>
  );
}

export default function BandejaTab({
  initialRawGrupos,
  scraperConfig,
  notasMostradas,
  notasTotal,
  initialEnvios,
  saludFuentes = [],
  origenInicial = "todos",
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [rawGrupos, setRawGrupos] = useState(initialRawGrupos);
  const [grupoStates, setGrupoStates] = useState(() => estadoInicial(initialRawGrupos));
  const [ocupados, setOcupados] = useState<string[]>([]); // grupos con una acción en curso
  const [filtros, setFiltros] = useState<FiltrosBandeja>(FILTROS_INICIALES);
  const [origen, setOrigen] = useState<Origen>(origenInicial);
  const [envios, setEnvios] = useState(initialEnvios);
  const enviosActivos = envios.filter((e) => ESTADOS_ACTIVOS.includes(e.estado)).length;
  // Meses/días/sitios COLAPSADOS (vacío = todo visible, el usuario colapsa lo que no le interesa).
  const [colapsados, toggleColapsado] = useToggleSet<string>();

  const scraper = useScraperConfig(scraperConfig);
  const [mostrarScraper, setMostrarScraper] = useState(false);

  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [menuProveedorGrupoId, setMenuProveedorGrupoId] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ providers?: AiProvider[] }>("/api/ai-providers").then((r) => {
      if (r.ok) setAiProviders(r.data?.providers || []);
    });
  }, []);

  const inboxCount = Object.keys(rawGrupos).length;
  const descartables = Object.values(rawGrupos).filter((n) => prioridadGrupo(n) === 3).length;
  const inboxVisibles = inboxCount - descartables; // los descartables quedan ocultos hasta pedirlos

  // ─── Publicar con IA (edición manual del scraper) ──────────────
  const [seleccionIA, setSeleccionIA] = useState<Set<string>>(new Set());
  const sincronizarTrasEdicion = useRef(false);
  const toggleSeleccionIA = (grupoId: string) =>
    setSeleccionIA((prev) => {
      const next = new Set(prev);
      if (next.has(grupoId)) next.delete(grupoId);
      else next.add(grupoId);
      return next;
    });
  const hoyAR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const gruposHoy = useMemo(
    () =>
      Object.values(rawGrupos).filter(
        (notas) =>
          notas[0] &&
          prioridadGrupo(notas) !== 3 &&
          new Date(notas[0].created_at).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }) === hoyAR
      ).length,
    [rawGrupos, hoyAR]
  );
  const idsSeleccionIA = Array.from(seleccionIA).filter((id) => rawGrupos[id]);
  const armarItemsIA = (): ItemManual[] =>
    idsSeleccionIA.map((id) => ({
      grupo_id: id,
      fuentes_ids: Array.from(grupoStates[id]?.seleccionadas ?? rawGrupos[id].map((n) => n.id)),
    }));
  const terminoEdicionManual = () => {
    // La corrida pudo procesar, fusionar o descartar grupos: se vuelve a leer la bandeja del servidor.
    sincronizarTrasEdicion.current = true;
    setSeleccionIA(new Set());
    router.refresh();
  };
  useEffect(() => {
    if (!sincronizarTrasEdicion.current) return;
    sincronizarTrasEdicion.current = false;
    setRawGrupos(initialRawGrupos);
    setGrupoStates(estadoInicial(initialRawGrupos));
  }, [initialRawGrupos]);

  // ─── Derivados ─────────────────────────────────────────────────
  // Cada filtro cuenta sus opciones aplicando los otros dos, así el número es lo que se vería al elegirla.
  const conteoSitios = useMemo(
    () => contarPor(filtrarGrupos(rawGrupos, filtros, "sitio"), sitiosGrupo),
    [rawGrupos, filtros]
  );
  const conteoSecciones = useMemo(
    () => contarPor(filtrarGrupos(rawGrupos, filtros, "seccion"), (n) => [seccionPrevistaGrupo(n)]),
    [rawGrupos, filtros]
  );
  const conteoPrioridad = useMemo(() => {
    const base = filtrarGrupos(rawGrupos, filtros, "prioridad");
    const c = { visibles: 0, prioritarias: 0, otras: 0, descartables: 0, todas: 0 };
    for (const notas of Object.values(base)) {
      const p = prioridadGrupo(notas);
      c.todas++;
      if (p === 1) c.prioritarias++;
      else if (p === 2) c.otras++;
      else c.descartables++;
      if (p !== 3) c.visibles++;
    }
    return c;
  }, [rawGrupos, filtros]);
  const gruposFiltrados = useMemo(() => filtrarGrupos(rawGrupos, filtros), [rawGrupos, filtros]);
  const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);
  const { gruposPorFecha, fechasOrdenadas } = useMemo(() => agruparPorFecha(gruposFiltrados), [gruposFiltrados]);
  const meses = useMemo(() => agruparDiasPorMes(fechasOrdenadas), [fechasOrdenadas]);
  const sugerenciasFusion = useMemo(() => calcularSugerenciasFusion(rawGrupos), [rawGrupos]);

  // ─── Helpers de estado ─────────────────────────────────────────
  const quitarGrupos = (ids: string[]) => {
    setRawGrupos((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setGrupoStates((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    router.refresh(); // actualiza el contador del menú
  };

  const conGrupoOcupado = async (grupoId: string, tarea: () => Promise<void>) => {
    setOcupados((prev) => [...prev, grupoId]);
    try {
      await tarea();
    } finally {
      setOcupados((prev) => prev.filter((id) => id !== grupoId));
    }
  };

  const actualizarGrupo = (grupoId: string, fn: (gs: GrupoEditState) => GrupoEditState) =>
    setGrupoStates((prev) => (prev[grupoId] ? { ...prev, [grupoId]: fn(prev[grupoId]) } : prev));

  const toggleFuente = (grupoId: string, notaId: string | number) =>
    actualizarGrupo(grupoId, (gs) => {
      const next = new Set(gs.seleccionadas);
      if (next.has(notaId)) {
        if (next.size <= 1) return gs; // no dejar vacío
        next.delete(notaId);
      } else {
        next.add(notaId);
      }
      return { ...gs, seleccionadas: next };
    });

  // ─── Acciones ──────────────────────────────────────────────────
  const procesarGrupo = async (grupoId: string, provider?: string) => {
    const gs = grupoStates[grupoId];
    const notas = rawGrupos[grupoId];
    if (!gs || !notas) return;

    const selectedIds = Array.from(gs.seleccionadas);
    if (selectedIds.length === 0) {
      toast("Seleccioná al menos una fuente antes de procesar con IA.");
      return;
    }
    const imagenUrl = notas.find((n) => n.id === gs.imagenId)?.imagen_url || null;

    setMenuProveedorGrupoId(null);
    await conGrupoOcupado(grupoId, async () => {
      const r = await adminFetch("/api/noticias/raw/procesar", {
        method: "POST",
        json: {
          grupo_id: grupoId,
          fuentes_ids: selectedIds,
          imagen_url: imagenUrl,
          provider: provider || undefined,
        },
      });
      if (!r.ok) {
        toast(`Error al procesar: ${r.error}`);
        // Ya la procesó otra pestaña o un clic anterior: el grupo no corresponde seguir mostrándolo.
        if (r.data?.codigo === "ya_procesada") quitarGrupos([grupoId]);
        return;
      }
      quitarGrupos([grupoId]);
    });
  };

  const descartarGrupo = async (grupoId: string) => {
    if (!confirm("¿Seguro que quieres descartar todo este grupo?")) return;
    await conGrupoOcupado(grupoId, async () => {
      const r = await adminFetch(`/api/noticias/raw/descartar?grupo_id=${encodeURIComponent(grupoId)}`, { method: "POST" });
      if (!r.ok) {
        toast(`No se pudo descartar el grupo: ${r.error}`);
        return;
      }
      quitarGrupos([grupoId]);
    });
  };

  const fusionarGrupos = async (grupoIdDestino: string, grupoIdOrigen: string) => {
    if (!confirm("¿Fusionar estos dos grupos? Se van a procesar juntos como una sola noticia.")) return;
    await conGrupoOcupado(grupoIdDestino, async () => {
      const r = await adminFetch("/api/noticias/raw/fusionar-grupos", {
        method: "POST",
        json: { grupo_id_destino: grupoIdDestino, grupo_id_origen: grupoIdOrigen },
      });
      if (!r.ok) {
        toast(`Error al fusionar: ${r.error}`);
        return;
      }
      setRawGrupos((prev) => {
        const next = { ...prev };
        next[grupoIdDestino] = [...(next[grupoIdDestino] || []), ...(next[grupoIdOrigen] || [])];
        delete next[grupoIdOrigen];
        return next;
      });
      setGrupoStates((prev) => {
        const next = { ...prev };
        const origen = next[grupoIdOrigen];
        const destino = next[grupoIdDestino];
        if (origen && destino) {
          next[grupoIdDestino] = {
            ...destino,
            seleccionadas: new Set([...destino.seleccionadas, ...origen.seleccionadas]),
          };
        }
        delete next[grupoIdOrigen];
        return next;
      });
      router.refresh();
    });
  };

  const descartarPorFecha = async (fecha: string, grupoIdsEnFecha: string[]) => {
    const totalGrupos = grupoIdsEnFecha.length;
    const totalNotas = grupoIdsEnFecha.reduce((sum, gid) => sum + (rawGrupos[gid]?.length || 0), 0);
    const msg = `⚠️ ATENCIÓN: Vas a descartar ${totalGrupos} grupo${totalGrupos !== 1 ? "s" : ""} con ${totalNotas} noticia${totalNotas !== 1 ? "s" : ""} sin procesar del ${fecha}.\n\nEsta acción no se puede deshacer. ¿Continuar?`;
    if (!confirm(msg)) return;

    const r = await adminFetch(`/api/noticias/raw/descartar?fecha=${fecha}`, { method: "POST" });
    if (!r.ok) {
      toast(`No se pudo descartar el día: ${r.error}`);
      return;
    }
    quitarGrupos(grupoIdsEnFecha);
  };

  const eliminarTodosLosGrupos = async () => {
    if (!confirm(`¿Descartar TODOS los grupos de la Bandeja de Entrada (${inboxCount} grupos)? Esta acción no se puede deshacer.`)) return;
    const r = await adminFetch("/api/noticias/raw/descartar?todos=true", { method: "POST" });
    if (!r.ok) {
      toast(`No se pudieron descartar los grupos: ${r.error}`);
      return;
    }
    quitarGrupos(Object.keys(rawGrupos));
  };

  const chipCls = (activo: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
      activo ? "bg-ink text-white border-ink" : "bg-white text-muted border-border hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-ink">📥 Bandeja de Entrada</h2>
        <p className="text-sm text-muted mt-1">Material crudo para revisar y procesar con IA: noticias del scraper y envíos de la gente.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setOrigen("todos")} className={chipCls(origen === "todos")}>
          Todos · {inboxVisibles + enviosActivos}
        </button>
        <button onClick={() => setOrigen("scraper")} className={chipCls(origen === "scraper")}>
          Scraper · {inboxVisibles}
        </button>
        <button onClick={() => setOrigen("ciudadano")} className={chipCls(origen === "ciudadano")}>
          Ciudadanos · {enviosActivos}
        </button>
      </div>

      {origen !== "scraper" && <EnviosBandeja envios={envios} setEnvios={setEnvios} />}

      {origen !== "ciudadano" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {origen === "todos" && <h3 className="text-lg font-bold text-ink">Noticias del scraper</h3>}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                {inboxVisibles} grupo{inboxVisibles !== 1 ? "s" : ""} nuevos{descartables > 0 ? ` · ${descartables} descartables ocultos` : ""}
              </span>
              <button
                onClick={() => setMostrarScraper((v) => !v)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:bg-gray-50 transition-colors"
              >
                ⚙️ Control del scraper
              </button>
              {inboxCount > 0 && (
                <button
                  onClick={eliminarTodosLosGrupos}
                  className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                >
                  🗑 Eliminar todos los grupos
                </button>
              )}
            </div>
          </div>

      <PublicarConIA
        gruposHoy={gruposHoy}
        seleccionados={idsSeleccionIA}
        armarItems={armarItemsIA}
        onTerminado={terminoEdicionManual}
      />

      <AvisoLimite mostrados={notasMostradas} total={notasTotal} cosa="noticias crudas" />

      {mostrarScraper && (
        <ScraperControl
          config={scraper.config}
          guardando={scraper.guardando}
          onGuardar={scraper.guardar}
          onToggleFuente={scraper.toggleFuente}
          salud={saludFuentes}
        />
      )}

      {inboxCount > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-white p-3">
          <FilaFiltro titulo="Prioridad">
            {PRIORIDADES.map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setFiltros((f) => ({ ...f, prioridad: valor }))}
                className={chipCls(filtros.prioridad === valor)}
              >
                {etiqueta} · {conteoPrioridad[valor]}
              </button>
            ))}
          </FilaFiltro>
          <FilaFiltro titulo="Sitio">
            <button onClick={() => setFiltros((f) => ({ ...f, sitio: "Todos" }))} className={chipCls(filtros.sitio === "Todos")}>
              Todos
            </button>
            {Object.keys(conteoSitios).sort((a, b) => conteoSitios[b] - conteoSitios[a]).map((s) => (
              <button key={s} onClick={() => setFiltros((f) => ({ ...f, sitio: s }))} className={chipCls(filtros.sitio === s)}>
                {s} · {conteoSitios[s]}
              </button>
            ))}
          </FilaFiltro>
          <FilaFiltro titulo="Iría a">
            <button onClick={() => setFiltros((f) => ({ ...f, seccion: "Todas" }))} className={chipCls(filtros.seccion === "Todas")}>
              Todas
            </button>
            {Object.keys(conteoSecciones).sort((a, b) => conteoSecciones[b] - conteoSecciones[a]).map((s) => (
              <button key={s} onClick={() => setFiltros((f) => ({ ...f, seccion: s }))} className={chipCls(filtros.seccion === s)}>
                {s} · {conteoSecciones[s]}
              </button>
            ))}
          </FilaFiltro>
          {hayFiltros && (
            <button onClick={() => setFiltros(FILTROS_INICIALES)} className="text-xs font-bold text-blue-600 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {inboxCount === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-border border-dashed">
          <span className="text-4xl">🔎</span>
          <h3 className="text-lg font-bold mt-4">Sin novedades</h3>
          <p className="text-muted mt-1">El scraper no encontró noticias nuevas. El próximo ciclo es en 15 minutos.</p>
        </div>
      ) : fechasOrdenadas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-border border-dashed">
          <span className="text-4xl">🔎</span>
          <h3 className="text-lg font-bold mt-4">Nada con estos filtros</h3>
          <p className="text-muted mt-1">Probá con otro sitio, otra sección o «Limpiar filtros».</p>
        </div>
      ) : (
        <div className="space-y-6">
          {meses.map((grupoMes) => {
            const mesColapsado = colapsados.has(`m:${grupoMes.key}`);
            const totalNotasMes = grupoMes.fechaKeys.reduce(
              (s, fk) => s + gruposPorFecha[fk].reduce((s2, g) => s2 + g.notas.length, 0),
              0
            );
            return (
              <div key={grupoMes.key} className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleColapsado(`m:${grupoMes.key}`)}
                  className="w-full flex justify-between items-center px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-ink capitalize">🗓️ {grupoMes.label}</span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    {totalNotasMes} noticia{totalNotasMes !== 1 ? "s" : ""}
                    <span className={`inline-block transition-transform ${mesColapsado ? "" : "rotate-180"}`}>▾</span>
                  </span>
                </button>

                {!mesColapsado && (
                  <div className="p-5 space-y-8">
                    {grupoMes.fechaKeys.map((fechaKey) => {
                      const [isoDate, fechaDisplay] = fechaKey.split("||");
                      const gruposDelDia = gruposPorFecha[fechaKey];
                      const totalNotasDelDia = gruposDelDia.reduce((s, g) => s + g.notas.length, 0);
                      const diaColapsado = colapsados.has(`d:${isoDate}`);
                      const { porSitio, sitiosOrdenados } = agruparPorSitio(gruposDelDia);

                      return (
                        <div key={fechaKey}>
                          {/* ── Cabecera de fecha ── */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b-2 border-blue-200">
                            <button onClick={() => toggleColapsado(`d:${isoDate}`)} className="flex items-center gap-2 text-left">
                              <span className={`inline-block transition-transform text-muted ${diaColapsado ? "" : "rotate-180"}`}>▾</span>
                              <div>
                                <h3 className="text-lg font-bold text-ink capitalize">📅 {fechaDisplay}</h3>
                                <p className="text-xs text-muted mt-0.5">
                                  {gruposDelDia.length} grupo{gruposDelDia.length !== 1 ? "s" : ""} · {totalNotasDelDia} noticia{totalNotasDelDia !== 1 ? "s" : ""} sin procesar
                                </p>
                              </div>
                            </button>
                            <button
                              onClick={() => descartarPorFecha(isoDate, gruposDelDia.map((g) => g.grupoId))}
                              className="px-4 py-2 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              🗑 Descartar todo el día ({gruposDelDia.length} grupo{gruposDelDia.length !== 1 ? "s" : ""})
                            </button>
                          </div>

                          {/* ── Grupos del día, agrupados por sitio de origen ── */}
                          {!diaColapsado && (
                            <div className="space-y-7">
                              {sitiosOrdenados.map((sitio) => {
                                const gruposDelSitio = porSitio[sitio];
                                const sitioColapsado = colapsados.has(`s:${isoDate}:${sitio}`);
                                return (
                                  <div key={sitio}>
                                    <button
                                      onClick={() => toggleColapsado(`s:${isoDate}:${sitio}`)}
                                      className="flex items-center gap-2 mb-3 text-left"
                                    >
                                      <span className={`inline-block transition-transform text-muted text-[10px] ${sitioColapsado ? "" : "rotate-180"}`}>▾</span>
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted bg-gray-100 px-2.5 py-1 rounded-full">
                                        📰 {sitio} · {gruposDelSitio.length}
                                      </span>
                                    </button>
                                    {!sitioColapsado && (
                                      <div className="space-y-6">
                                        {gruposDelSitio.map(({ grupoId, notas }) => {
                                          const gs = grupoStates[grupoId];
                                          if (!gs) return null;
                                          return (
                                            <GrupoCard
                                              key={grupoId}
                                              grupoId={grupoId}
                                              notas={notas}
                                              estado={gs}
                                              sugerencia={sugerenciasFusion[grupoId]}
                                              procesando={ocupados.includes(grupoId)}
                                              aiProviders={aiProviders}
                                              menuProveedorAbierto={menuProveedorGrupoId === grupoId}
                                              seleccionado={seleccionIA.has(grupoId)}
                                              onToggleSeleccion={() => toggleSeleccionIA(grupoId)}
                                              onToggleFuente={(notaId) => toggleFuente(grupoId, notaId)}
                                              onElegirImagen={(notaId) => actualizarGrupo(grupoId, (s) => ({ ...s, imagenId: notaId }))}
                                              onFusionar={(origen) => fusionarGrupos(grupoId, origen)}
                                              onDescartar={() => descartarGrupo(grupoId)}
                                              onProcesar={(provider) => procesarGrupo(grupoId, provider)}
                                              onToggleMenuProveedor={() =>
                                                setMenuProveedorGrupoId(menuProveedorGrupoId === grupoId ? null : grupoId)
                                              }
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
