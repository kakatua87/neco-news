"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Noticia } from "@/types/noticia";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useToggleSet } from "../_lib/useToggleSet";
import { useScraperConfig } from "../_lib/useScraperConfig";
import type { ScraperConfig } from "../_lib/scraperConfig";
import GrupoCard, { type AiProvider, type GrupoEditState } from "./GrupoCard";
import ScraperControl from "./ScraperControl";
import AvisoLimite from "../_lib/AvisoLimite";
import EnviosBandeja from "./EnviosBandeja";
import { ESTADOS_ACTIVOS, type Envio } from "../_lib/envios";
import { agruparDiasPorMes, agruparPorFecha, agruparPorSitio, calcularSugerenciasFusion } from "./agrupar";

type Props = {
  initialRawGrupos: Record<string, Noticia[]>;
  scraperConfig: ScraperConfig;
  secciones: string[];
  notasMostradas: number;
  notasTotal: number;
  initialEnvios: Envio[];
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
      seccion: notas[0]?.seccion || "Local",
    };
  }
  return estados;
}

export default function BandejaTab({
  initialRawGrupos,
  scraperConfig,
  secciones,
  notasMostradas,
  notasTotal,
  initialEnvios,
  origenInicial = "todos",
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [rawGrupos, setRawGrupos] = useState(initialRawGrupos);
  const [grupoStates, setGrupoStates] = useState(() => estadoInicial(initialRawGrupos));
  const [ocupados, setOcupados] = useState<string[]>([]); // grupos con una acción en curso
  const [seccionFiltro, setSeccionFiltro] = useState("Todas");
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

  // ─── Derivados ─────────────────────────────────────────────────
  const seccionesEnInbox = useMemo(
    () => Array.from(new Set(Object.values(rawGrupos).map((notas) => notas[0]?.seccion || "Local"))).sort(),
    [rawGrupos]
  );
  const { gruposPorFecha, fechasOrdenadas } = useMemo(
    () => agruparPorFecha(rawGrupos, seccionFiltro),
    [rawGrupos, seccionFiltro]
  );
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
          seccion: gs.seccion,
          provider: provider || undefined,
        },
      });
      if (!r.ok) {
        toast(`Error al procesar: ${r.error}`);
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
          Todos · {inboxCount + enviosActivos}
        </button>
        <button onClick={() => setOrigen("scraper")} className={chipCls(origen === "scraper")}>
          Scraper · {inboxCount}
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
                {inboxCount} grupo{inboxCount !== 1 ? "s" : ""} nuevos
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

      <AvisoLimite mostrados={notasMostradas} total={notasTotal} cosa="noticias crudas" />

      {mostrarScraper && (
        <ScraperControl
          config={scraper.config}
          guardando={scraper.guardando}
          onGuardar={scraper.guardar}
          onToggleFuente={scraper.toggleFuente}
        />
      )}

      {inboxCount > 0 && seccionesEnInbox.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSeccionFiltro("Todas")} className={chipCls(seccionFiltro === "Todas")}>
            Todas
          </button>
          {seccionesEnInbox.map((sec) => (
            <button key={sec} onClick={() => setSeccionFiltro(sec)} className={chipCls(seccionFiltro === sec)}>
              {sec}
            </button>
          ))}
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
          <h3 className="text-lg font-bold mt-4">Nada en &quot;{seccionFiltro}&quot;</h3>
          <p className="text-muted mt-1">No hay grupos nuevos de esta sección por ahora.</p>
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
                                              secciones={secciones}
                                              sugerencia={sugerenciasFusion[grupoId]}
                                              procesando={ocupados.includes(grupoId)}
                                              aiProviders={aiProviders}
                                              menuProveedorAbierto={menuProveedorGrupoId === grupoId}
                                              onToggleFuente={(notaId) => toggleFuente(grupoId, notaId)}
                                              onElegirImagen={(notaId) => actualizarGrupo(grupoId, (s) => ({ ...s, imagenId: notaId }))}
                                              onCambiarSeccion={(seccion) => actualizarGrupo(grupoId, (s) => ({ ...s, seccion }))}
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
