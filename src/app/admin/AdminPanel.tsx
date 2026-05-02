"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Noticia } from "@/types/noticia";

type Editable = Pick<Noticia, "id" | "titulo" | "cuerpo" | "seccion" | "imagen_url" | "created_at">;

type Props = {
  initialItems: Editable[];
  stats: {
    publicadas: number;
    pendientes: number;
    descartadas: number;
  };
};

type Tab = "dashboard" | "pendientes" | "config";

export default function AdminPanel({ initialItems, stats }: Props) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Array<string | number>>([]);
  const [activeTab, setActiveTab] = useState<Tab>("pendientes");
  const [editingId, setEditingId] = useState<string | number | null>(null);

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
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "dashboard" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab("pendientes")}
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
            onClick={() => setActiveTab("config")}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "config" ? "bg-accent text-white" : "text-cream/70 hover:bg-cream/10"
            }`}
          >
            ⚙️ Configuración
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
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                            {item.seccion}
                          </span>
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
                  <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                    <span>NDEN (Necochea Digital)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked readOnly className="w-4 h-4 accent-accent" />
                    <span>Diario Necochea</span>
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
