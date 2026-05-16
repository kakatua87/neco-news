"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Noticia } from "@/types/noticia";
import { logoutAction } from "./actions";

const SECCIONES = [
  "Política", "Economía", "Policiales", "Local", 
  "Deportes", "Sociedad", "Salud", "Cultura", 
  "Tecnología", "Educación"
];

/* ─── Estado local de cada grupo en la bandeja ─── */
type GrupoEditState = {
  seleccionadas: Set<string | number>;   // IDs de fuentes seleccionadas
  imagenId: string | number | null;       // ID de la nota cuya imagen se usará
  seccion: string;
};

type Editable = Pick<Noticia, "id" | "titulo" | "cuerpo" | "seccion" | "imagen_url" | "created_at"> & {
  tiene_perspectiva_editorial?: boolean;
  es_portada?: boolean;
  fecha_publicacion?: string;
  url_original?: string | null;
};

type Props = {
  initialItems: Editable[];
  initialRawGrupos?: Record<string, Noticia[]>;
  stats: {
    publicadas: number;
    pendientes: number;
    descartadas: number;
  };
  dbSecciones?: string[];
};

type Tab = "dashboard" | "inbox" | "pendientes" | "publicadas" | "config";

export default function AdminPanel({ initialItems, initialRawGrupos = {}, stats, dbSecciones }: Props) {
  const [items, setItems] = useState(initialItems);
  const [rawGrupos, setRawGrupos] = useState<Record<string, Noticia[]>>(initialRawGrupos);
  const [savingIds, setSavingIds] = useState<Array<string | number>>([]);
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [publicadasItems, setPublicadasItems] = useState<Editable[]>([]);
  const [publicadasFetched, setPublicadasFetched] = useState(false);
  const [seccionFiltro, setSeccionFiltro] = useState<string>("Todas");
  
  const allSecciones = Array.from(new Set([...SECCIONES, ...(dbSecciones || [])]));
  const [customSecciones, setCustomSecciones] = useState<string[]>(allSecciones);

  const pendientesCount = items.length;
  const inboxCount = Object.keys(rawGrupos).length;

  // ─── Estado interactivo de cada grupo (selección, imagen, sección) ──
  const [grupoStates, setGrupoStates] = useState<Record<string, GrupoEditState>>(() => {
    const initial: Record<string, GrupoEditState> = {};
    for (const [gid, notas] of Object.entries(initialRawGrupos)) {
      const firstWithImage = notas.find(n => n.imagen_url);
      initial[gid] = {
        seleccionadas: new Set(notas.map(n => n.id)),
        imagenId: firstWithImage?.id ?? null,
        seccion: notas[0]?.seccion || "Local",
      };
    }
    return initial;
  });

  const toggleFuente = (grupoId: string, notaId: string | number) => {
    setGrupoStates(prev => {
      const gs = prev[grupoId];
      if (!gs) return prev;
      const next = new Set(gs.seleccionadas);
      if (next.has(notaId)) {
        if (next.size <= 1) return prev; // no dejar vacío
        next.delete(notaId);
      } else {
        next.add(notaId);
      }
      return { ...prev, [grupoId]: { ...gs, seleccionadas: next } };
    });
  };

  const setImagen = (grupoId: string, notaId: string | number) => {
    setGrupoStates(prev => {
      const gs = prev[grupoId];
      if (!gs) return prev;
      return { ...prev, [grupoId]: { ...gs, imagenId: notaId } };
    });
  };

  const setSeccionGrupo = (grupoId: string, seccion: string) => {
    setGrupoStates(prev => {
      const gs = prev[grupoId];
      if (!gs) return prev;
      return { ...prev, [grupoId]: { ...gs, seccion } };
    });
  };

  const updateItem = (id: string | number, field: keyof Editable, value: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const withSaving = async (id: string | number, task: () => Promise<void>) => {
    setSavingIds((prev) => [...prev, id]);
    try {
      await task();
    } finally {
      setSavingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const publicar = async (item: Editable) =>
    withSaving(item.id, async () => {
      const res = await fetch("/api/publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          titulo: item.titulo,
          cuerpo: item.cuerpo,
        }),
      });
      if (!res.ok) return;
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    });

  const descartar = async (item: Editable) =>
    withSaving(item.id, async () => {
      const res = await fetch("/api/telegram-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query: { data: `des_${item.id}` } }),
      });
      if (!res.ok) return;
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    });

  const cambiarSeccion = async (item: Editable, nuevaSeccion: string, isPublicada: boolean = false) => {
    if (isPublicada) {
      setPublicadasItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, seccion: nuevaSeccion } : n)));
    } else {
      updateItem(item.id, "seccion", nuevaSeccion);
    }
    withSaving(item.id, async () => {
      await fetch(`/api/noticias/${item.id}/seccion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: nuevaSeccion }),
      });
    });
  };

  const getRecomendacionSeccion = (id: string | number) => {
    const original = initialItems.find(n => n.id === id);
    return original?.seccion || "Local";
  };

  const fetchPublicadas = async () => {
    if (publicadasFetched) return;
    try {
      const res = await fetch("/api/noticias/publicadas");
      if (res.ok) {
        const data = await res.json();
        setPublicadasItems(data);
        setPublicadasFetched(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const eliminarPublicada = async (id: string | number) => {
    if (!confirm("¿Seguro que quieres eliminar esta noticia?")) return;
    setPublicadasItems((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/noticias/${id}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
    }
  };

  const marcarPortada = async (id: string | number) => {
    setPublicadasItems((prev) =>
      prev.map((n) => ({ ...n, es_portada: n.id === id }))
    );
    try {
      await fetch(`/api/noticias/${id}/portada`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const procesarGrupo = async (grupoId: string) => {
    const gs = grupoStates[grupoId];
    const notas = rawGrupos[grupoId];
    if (!gs || !notas) return;

    const selectedIds = Array.from(gs.seleccionadas);
    const imagenNota = notas.find(n => n.id === gs.imagenId);
    const imagenUrl = imagenNota?.imagen_url || null;

    const refId = selectedIds[0];
    withSaving(refId, async () => {
      try {
        const res = await fetch("/api/noticias/raw/procesar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grupo_id: grupoId,
            fuentes_ids: selectedIds,
            imagen_url: imagenUrl,
            seccion: gs.seccion,
          }),
        });
        
        if (res.ok) {
          setRawGrupos(prev => {
            const next = { ...prev };
            delete next[grupoId];
            return next;
          });
          setGrupoStates(prev => {
            const next = { ...prev };
            delete next[grupoId];
            return next;
          });
          // Refrescar pendientes con un reload suave
          window.location.reload();
        } else {
          const err = await res.json();
          alert(`Error al procesar: ${err.error || "Error desconocido"}`);
        }
      } catch (e) {
        console.error(e);
        alert("Error de conexión con el motor de IA.");
      }
    });
  };

  const descartarGrupo = async (grupoId: string) => {
    if (!confirm("¿Seguro que quieres descartar todo este grupo?")) return;
    const refId = Object.keys(savingIds)[0] || grupoId; // solo para el loading state
    withSaving(refId, async () => {
      try {
        // Marcamos en Supabase directamente (o vía API)
        const res = await fetch(`/api/noticias/raw/descartar?grupo_id=${grupoId}`, { method: "POST" });
        if (res.ok) {
          setRawGrupos(prev => {
            const next = { ...prev };
            delete next[grupoId];
            return next;
          });
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "publicadas") {
      fetchPublicadas();
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-full md:w-64 bg-ink text-cream flex-shrink-0">
        <div className="p-6">
          <Link href="/">
            <img
              src="/LOGO.png"
              alt="Neco Now"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <div className="mt-2 text-xs text-cream/50 uppercase tracking-widest">Panel Editorial</div>
        </div>
        
        <nav className="mt-6 px-4 space-y-2">
          <button
            onClick={() => handleTabChange("dashboard")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dashboard" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => handleTabChange("inbox")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center transition-colors ${
              activeTab === "inbox" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            <span>📥 Bandeja de Entrada</span>
            {inboxCount > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {inboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("pendientes")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center transition-colors ${
              activeTab === "pendientes" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            <span>📝 Pendientes</span>
            {pendientesCount > 0 && (
              <span className="bg-cream text-ink text-xs font-bold px-2 py-0.5 rounded-full">
                {pendientesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange("publicadas")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "publicadas" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            📰 Publicadas
          </button>
          <button
            onClick={() => handleTabChange("config")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "config" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            ⚙️ Configuración
          </button>
          <button
            onClick={() => logoutAction()}
            className="w-full text-left px-4 py-2.5 mt-8 border-t border-cream/10 rounded-lg text-sm font-medium transition-colors text-cream/70 hover:text-red-400 hover:bg-red-400/10"
          >
            🚪 Cerrar sesión
          </button>
        </nav>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl">
        
        {/* TAB: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 fade-in">
            <h2 className="text-2xl font-bold text-ink">Resumen del Sistema</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-muted font-medium uppercase tracking-wide">Bandeja</p>
                <p className="text-4xl font-bold text-blue-500 mt-2">{inboxCount}</p>
                <p className="text-xs text-muted mt-2 font-medium">Grupos sin procesar</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-muted font-medium uppercase tracking-wide">Publicadas</p>
                <p className="text-4xl font-bold text-ink mt-2">{stats.publicadas}</p>
                <p className="text-xs text-[#25D366] mt-2 font-medium">↑ Visibles en portal</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-muted font-medium uppercase tracking-wide">Pendientes</p>
                <p className="text-4xl font-bold text-accent mt-2">{pendientesCount}</p>
                <p className="text-xs text-muted mt-2 font-medium">Esperando revisión</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                <p className="text-sm text-muted font-medium uppercase tracking-wide">Descartadas</p>
                <p className="text-4xl font-bold text-ink mt-2">{stats.descartadas}</p>
                <p className="text-xs text-muted mt-2 font-medium">Archivadas</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
              <h3 className="text-lg font-bold text-ink mb-4">Estado del Motor IA</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-muted mb-1">Proveedor Activo</p>
                  <p className="font-bold">Groq (Llama 3.3)</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-muted mb-1">Status</p>
                  <p className="font-bold text-[#25D366]">● Operativo</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-muted mb-1">Costo Estimado</p>
                  <p className="font-bold">$0.00</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-muted mb-1">Última sincro</p>
                  <p className="font-bold">Hace 5 min</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: INBOX (RAW) */}
        {activeTab === "inbox" && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
              <div>
                <h2 className="text-2xl font-bold text-ink">📥 Bandeja de Entrada</h2>
                <p className="text-sm text-muted mt-1">Noticias crudas recién scrapeadas. Seleccioná fuentes, elegí imagen, y procesá con IA.</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                {inboxCount} grupo{inboxCount !== 1 ? "s" : ""} nuevos
              </span>
            </div>

            {inboxCount === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-border border-dashed">
                <span className="text-4xl">🔎</span>
                <h3 className="text-lg font-bold mt-4">Sin novedades</h3>
                <p className="text-muted mt-1">El scraper no encontró noticias nuevas. El próximo ciclo es en 15 minutos.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(rawGrupos).map(([grupoId, notas]) => {
                  const gs = grupoStates[grupoId];
                  const isSaving = notas.some(n => savingIds.includes(n.id));
                  if (!gs) return null;

                  // Nota cuya imagen está seleccionada
                  const imagenActiva = notas.find(n => n.id === gs.imagenId);

                  return (
                    <div key={grupoId} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                      {/* ── Header del grupo ── */}
                      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              {notas.length} fuente{notas.length !== 1 ? "s" : ""}
                            </span>
                            <span className="text-[10px] text-muted">
                              {new Date(notas[0].created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-ink leading-tight">
                            {notas[0].titulo_original || notas[0].titulo}
                          </h3>
                        </div>
                        
                        {/* Sección selector */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted">Sección:</span>
                          <select 
                            value={gs.seccion}
                            onChange={(e) => setSeccionGrupo(grupoId, e.target.value)}
                            className="text-sm border border-border rounded-lg px-3 py-1.5 outline-none focus:border-accent bg-white font-medium"
                          >
                            {customSecciones.map((sec) => (
                              <option key={sec} value={sec}>{sec}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* ── Fuentes (cada nota del grupo) ── */}
                      <div className="p-6">
                        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-3">Fuentes disponibles (hacé click para seleccionar/deseleccionar)</p>
                        <div className="space-y-3">
                          {notas.map(nota => {
                            const isSelected = gs.seleccionadas.has(nota.id);
                            const isImageActive = gs.imagenId === nota.id;
                            return (
                              <div key={nota.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected 
                                  ? "border-blue-400 bg-blue-50/50" 
                                  : "border-gray-100 bg-gray-50 opacity-60"
                              }`}>
                                {/* Checkbox de selección */}
                                <button 
                                  onClick={() => toggleFuente(grupoId, nota.id)}
                                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                                    isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <span className="text-xs font-bold">✓</span>}
                                </button>

                                {/* Imagen de la nota + selector */}
                                <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative group">
                                  {nota.imagen_url ? (
                                    <>
                                      <img src={nota.imagen_url} alt="" className="w-full h-full object-cover" />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setImagen(grupoId, nota.id); }}
                                        className={`absolute inset-0 flex items-center justify-center transition-all ${
                                          isImageActive 
                                            ? "bg-green-500/30 ring-2 ring-green-500 ring-inset" 
                                            : "bg-black/0 group-hover:bg-black/30"
                                        }`}
                                        title={isImageActive ? "Imagen seleccionada" : "Usar esta imagen"}
                                      >
                                        <span className={`text-lg ${isImageActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} text-white drop-shadow-lg`}>
                                          {isImageActive ? "✅" : "🖼"}
                                        </span>
                                      </button>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                                  )}
                                </div>
                                
                                {/* Info de la nota */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                      {nota.fuente || "Fuente"}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-ink leading-snug line-clamp-2">
                                    {nota.titulo_original || nota.titulo}
                                  </h4>
                                  <p className="text-xs text-muted mt-1 line-clamp-2">
                                    {nota.cuerpo?.substring(0, 150)}...
                                  </p>
                                  {nota.url_original && (
                                    <a href={nota.url_original} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                                      Ver artículo original →
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* ── Imagen Preview + Acciones ── */}
                        <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between border-t border-border pt-5">
                          <div className="flex items-center gap-3">
                            {imagenActiva?.imagen_url ? (
                              <div className="flex items-center gap-3">
                                <img src={imagenActiva.imagen_url} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-green-400" />
                                <span className="text-xs text-muted">
                                  Imagen de <strong>{imagenActiva.fuente}</strong>
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted italic">Sin imagen seleccionada</span>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => descartarGrupo(grupoId)}
                              disabled={isSaving}
                              className="px-5 py-2.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              ✕ Descartar grupo
                            </button>
                            <button
                              onClick={() => procesarGrupo(grupoId)}
                              disabled={isSaving}
                              className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSaving ? (
                                <>
                                  <span className="animate-spin">⏳</span> Procesando...
                                </>
                              ) : (
                                "⚡ Procesar con IA"
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: PENDIENTES */}
        {activeTab === "pendientes" && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-ink">Revisión Editorial</h2>
            </div>
            
            {pendientesCount === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-border border-dashed">
                <span className="text-4xl">☕</span>
                <h3 className="text-lg font-bold mt-4">Todo al día</h3>
                <p className="text-muted mt-1">No hay noticias pendientes de revisión.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const saving = savingIds.includes(item.id);
                  const isEditing = editingId === item.id;
                  
                  return (
                    <article key={item.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col md:flex-row">
                      {/* Imagen Preview */}
                      <div className="md:w-48 h-32 md:h-auto bg-gray-100 flex-shrink-0">
                        {item.imagen_url ? (
                          <img src={item.imagen_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                        )}
                      </div>
                      
                      {/* Contenido */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex flex-col gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                              {item.seccion}
                            </span>
                            {item.tiene_perspectiva_editorial && (
                              <span className="text-xs font-bold text-[#1da64f] bg-[#25D366]/20 px-2 py-1 rounded flex items-center">
                                ✍ Con análisis
                              </span>
                            )}
                          </div>
                          
                          {/* Selector de Sección */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <select 
                              value={item.seccion || ""}
                              onChange={(e) => cambiarSeccion(item, e.target.value)}
                              className="text-xs border border-border rounded px-2 py-1.5 outline-none focus:border-accent bg-gray-50"
                            >
                              {customSecciones.map((sec) => (
                                <option key={sec} value={sec}>{sec}</option>
                              ))}
                            </select>
                            <div className="flex">
                              <input 
                                type="text" 
                                placeholder="Nueva sección..." 
                                className="text-xs border border-border rounded px-2 py-1.5 w-32 outline-none focus:border-accent"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const val = e.currentTarget.value.trim();
                                    if (!customSecciones.includes(val)) {
                                      setCustomSecciones([...customSecciones, val]);
                                    }
                                    cambiarSeccion(item, val);
                                    e.currentTarget.value = "";
                                  }
                                }}
                              />
                            </div>
                            {getRecomendacionSeccion(item.id) && (
                              <div className="text-[10px] text-muted flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 
                                Sugerencia: <strong className="text-blue-700">{getRecomendacionSeccion(item.id)}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isEditing ? (
                          <div className="space-y-3 mt-2">
                            <input
                              value={item.titulo}
                              onChange={(e) => updateItem(item.id, "titulo", e.target.value)}
                              className="w-full font-editorial text-xl font-bold border border-accent/50 rounded p-2 outline-none focus:ring-1 focus:ring-accent"
                            />
                            <textarea
                              value={item.cuerpo}
                              onChange={(e) => updateItem(item.id, "cuerpo", e.target.value)}
                              rows={6}
                              className="w-full text-sm leading-relaxed border border-accent/50 rounded p-2 outline-none focus:ring-1 focus:ring-accent"
                            />
                          </div>
                        ) : (
                          <div className="mt-1">
                            <h3 className="font-editorial text-xl font-bold text-ink">{item.titulo}</h3>
                            <p className="text-sm text-muted mt-2 line-clamp-2 leading-relaxed">
                              {item.cuerpo}
                            </p>
                          </div>
                        )}
                        
                        {/* Acciones */}
                        <div className="mt-auto pt-4 flex gap-2 justify-end">
                          <button
                            onClick={() => descartar(item)}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-muted hover:text-ink hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Descartar
                          </button>
                          
                          <button
                            onClick={() => isEditing ? setEditingId(null) : setEditingId(item.id)}
                            disabled={saving}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                              isEditing ? "bg-gray-200 text-ink" : "bg-ink text-white hover:bg-ink/80"
                            }`}
                          >
                            {isEditing ? "Ocultar editor" : "Editar"}
                          </button>
                          
                          <button
                            onClick={() => publicar(item)}
                            disabled={saving}
                            className="px-6 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-dark shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                          >
                            {saving ? "Guardando..." : "Publicar"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: PUBLICADAS */}
        {activeTab === "publicadas" && (
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-ink mb-6">Noticias Publicadas</h2>
            
            {/* Row de Filtros por Sección */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSeccionFiltro("Todas")}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                  seccionFiltro === "Todas" ? "bg-ink text-white border-ink" : "bg-white text-muted border-border hover:bg-gray-50"
                }`}
              >
                Todas
              </button>
              {customSecciones.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSeccionFiltro(sec)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                    seccionFiltro === sec ? "bg-ink text-white border-ink" : "bg-white text-muted border-border hover:bg-gray-50"
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicadasItems
                .filter((item) => seccionFiltro === "Todas" || item.seccion === seccionFiltro)
                .map((item) => (
                <article key={item.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                  <div className="h-40 bg-gray-100 flex-shrink-0 relative">
                    {item.imagen_url ? (
                      <img src={item.imagen_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                    )}
                    {item.es_portada && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">
                        ⭐ Portada
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex flex-col mb-2 gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                          {item.seccion}
                        </span>
                        {item.fecha_publicacion && (
                          <span className="text-xs text-muted whitespace-nowrap">
                            {new Date(item.fecha_publicacion).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <select 
                          value={item.seccion || ""}
                          onChange={(e) => cambiarSeccion(item, e.target.value, true)}
                          className="text-[10px] border border-border rounded px-1.5 py-1 outline-none focus:border-accent bg-gray-50"
                        >
                          {customSecciones.map((sec) => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                        <input 
                          type="text" 
                          placeholder="Nueva..." 
                          className="text-[10px] border border-border rounded px-1.5 py-1 w-20 outline-none focus:border-accent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              const val = e.currentTarget.value.trim();
                              if (!customSecciones.includes(val)) {
                                setCustomSecciones([...customSecciones, val]);
                              }
                              cambiarSeccion(item, val, true);
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                    <h3 className="font-editorial text-lg font-bold text-ink leading-tight line-clamp-3 mb-4">{item.titulo}</h3>
                    
                    <div className="mt-auto pt-4 border-t border-border/50 flex gap-2 justify-between items-center">
                      <button
                        onClick={() => eliminarPublicada(item.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => marcarPortada(item.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                          item.es_portada ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-ink hover:bg-gray-200"
                        }`}
                      >
                        {item.es_portada ? "⭐ Es Portada" : "⭐ Portada"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              
              {publicadasItems.length === 0 && publicadasFetched && (
                <div className="col-span-full text-center py-12 text-muted">
                  No hay noticias publicadas para mostrar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CONFIGURACIÓN */}
        {activeTab === "config" && (
          <div className="space-y-6 fade-in max-w-3xl">
            <h2 className="text-2xl font-bold text-ink mb-6">Configuración del Pipeline</h2>
            
            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-ink mb-2">Motor de Inteligencia Artificial</h3>
                <p className="text-sm text-muted mb-4">
                  El sistema utiliza arquitectura multi-proveedor. Actualmente configurado mediante variables de entorno en el servidor de scraping.
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border border-border rounded-lg bg-gray-50">
                    <span className="font-medium">Groq (Llama 3.3 70B)</span>
                    <span className="bg-[#25D366]/20 text-[#1da64f] text-xs font-bold px-2 py-1 rounded">Activo (Gratis)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border rounded-lg bg-blue-50/50">
                    <span className="font-medium">Claude API (Anthropic)</span>
                    <span className="text-blue-600 bg-blue-100 text-xs font-bold px-2 py-1 rounded">Mejor español — recomendado</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border border-border rounded-lg opacity-60 grayscale">
                    <span className="font-medium">OpenAI (GPT-4o-mini)</span>
                    <span className="text-xs font-bold px-2 py-1">Requiere pago</span>
                  </div>
                </div>
              </div>
              
              <hr className="border-border" />
              
              <div>
                <h3 className="font-bold text-ink mb-2">Fuentes de Noticias</h3>
                <div className="space-y-2">
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">NDEN (Necochea Digital)</span>
                    </div>
                    <span className="text-xs text-muted ml-7">nden.com.ar</span>
                  </label>
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">Diario Necochea</span>
                    </div>
                    <span className="text-xs text-muted ml-7">diarionecochea.com</span>
                  </label>
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">Diario 4V</span>
                    </div>
                    <span className="text-xs text-muted ml-7">diario4v.com</span>
                  </label>
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">TSN Necochea</span>
                    </div>
                    <span className="text-xs text-muted ml-7">tsnnecochea.com.ar</span>
                  </label>
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">Diario NQ</span>
                    </div>
                    <span className="text-xs text-muted ml-7">diarionq.com.ar</span>
                  </label>
                  <label className="flex flex-col p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                      <span className="font-medium">El Ecos</span>
                    </div>
                    <span className="text-xs text-muted ml-7">elecos.com.ar</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
