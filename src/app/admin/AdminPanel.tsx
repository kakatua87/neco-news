"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Noticia } from "@/types/noticia";
import { logoutAction } from "./actions";

const SECCIONES = [
  "Política", "Economía", "Policiales", "Local", 
  "Deportes", "Sociedad", "Salud", "Cultura", 
  "Tecnología", "Educación"
];

type Editable = Pick<Noticia, "id" | "titulo" | "cuerpo" | "seccion" | "imagen_url" | "created_at"> & {
  tiene_perspectiva_editorial?: boolean;
  es_portada?: boolean;
  fecha_publicacion?: string;
};

type Props = {
  initialItems: Editable[];
  stats: {
    publicadas: number;
    pendientes: number;
    descartadas: number;
  };
};

type Tab = "dashboard" | "pendientes" | "publicadas" | "config";

export default function AdminPanel({ initialItems, stats }: Props) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Array<string | number>>([]);
  const [activeTab, setActiveTab] = useState<Tab>("pendientes");
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [publicadasItems, setPublicadasItems] = useState<Editable[]>([]);
  const [publicadasFetched, setPublicadasFetched] = useState(false);
  const [seccionFiltro, setSeccionFiltro] = useState<string>("Todas");
  
  const [customSecciones, setCustomSecciones] = useState<string[]>(SECCIONES);

  const pendientesCount = items.length;

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

  const cambiarSeccion = async (item: Editable, nuevaSeccion: string) => {
    updateItem(item.id, "seccion", nuevaSeccion);
    withSaving(item.id, async () => {
      await fetch(`/api/noticias/${item.id}/seccion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: nuevaSeccion }),
      });
    });
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
            <Image src="/logo.png" alt="Neco News" width={140} height={35} className="h-8 w-auto invert brightness-0" />
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <div className="flex items-center gap-2 mt-1">
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
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                        {item.seccion}
                      </span>
                      {item.fecha_publicacion && (
                        <span className="text-xs text-muted whitespace-nowrap">
                          {new Date(item.fecha_publicacion).toLocaleDateString()}
                        </span>
                      )}
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
