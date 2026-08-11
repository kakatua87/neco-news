"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BannerImageModal from "./BannerImageModal";

export type Banner = {
  id: string;
  zona: string;
  nombre: string | null;
  imagen_url: string | null;
  url_destino: string | null;
  codigo_html: string | null;
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  /** Zona fija (wireframe) o "" si es una zona personalizada a definir en el formulario. */
  zona: string;
  zonaLabel: string;
  aspectRatio: number;
  sizeLabel: string;
  onClose: () => void;
  onChanged: () => void;
};

const emptyForm = {
  id: null as string | null,
  zonaCustom: "",
  nombre: "",
  imagen_url: "",
  url_destino: "",
  codigo_html: "",
  activo: true,
  fecha_inicio: "",
  fecha_fin: "",
};

export default function BannerZoneModal({ isOpen, zona, zonaLabel, aspectRatio, sizeLabel, onClose, onChanged }: Props) {
  const [screen, setScreen] = useState<"list" | "form">(zona ? "list" : "form");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [tipoContenido, setTipoContenido] = useState<"imagen" | "html">("imagen");
  const [guardando, setGuardando] = useState(false);
  const [editandoImagen, setEditandoImagen] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      if (res.ok) setBanners((data.banners || []).filter((b: Banner) => b.zona === zona));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setScreen(zona ? "list" : "form");
    setForm(emptyForm);
    setTipoContenido("imagen");
    if (zona) fetchBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, zona]);

  const empezarNuevo = () => {
    setForm(emptyForm);
    setTipoContenido("imagen");
    setScreen("form");
  };

  const editar = (b: Banner) => {
    setForm({
      id: b.id,
      zonaCustom: b.zona,
      nombre: b.nombre || "",
      imagen_url: b.imagen_url || "",
      url_destino: b.url_destino || "",
      codigo_html: b.codigo_html || "",
      activo: b.activo,
      fecha_inicio: b.fecha_inicio ? b.fecha_inicio.slice(0, 16) : "",
      fecha_fin: b.fecha_fin ? b.fecha_fin.slice(0, 16) : "",
    });
    setTipoContenido(b.codigo_html ? "html" : "imagen");
    setScreen("form");
  };

  const toggleActivo = async (b: Banner) => {
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, activo: !x.activo } : x)));
    const res = await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !b.activo }),
    });
    if (!res.ok) fetchBanners();
    onChanged();
  };

  const eliminar = async (b: Banner) => {
    if (!confirm(`¿Eliminar el banner "${b.nombre || b.zona}"?`)) return;
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
    const res = await fetch(`/api/banners/${b.id}`, { method: "DELETE" });
    if (!res.ok) fetchBanners();
    onChanged();
  };

  const guardar = async () => {
    const zonaFinal = (zona || form.zonaCustom).trim();
    if (!zonaFinal) {
      alert("Escribí un nombre de zona.");
      return;
    }
    if (tipoContenido === "imagen" && !form.imagen_url.trim()) {
      alert("Cargá una imagen.");
      return;
    }
    if (tipoContenido === "html" && !form.codigo_html.trim()) {
      alert("Pegá el código HTML del anuncio.");
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        zona: zonaFinal,
        nombre: form.nombre,
        imagen_url: tipoContenido === "imagen" ? form.imagen_url.trim() : "",
        codigo_html: tipoContenido === "html" ? form.codigo_html.trim() : "",
        url_destino: form.url_destino,
        activo: form.activo,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      };
      const res = await fetch(form.id ? `/api/banners/${form.id}` : "/api/banners", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`No se pudo guardar el banner: ${data.error || "error desconocido"}`);
        return;
      }
      onChanged();
      if (zona) {
        setScreen("list");
        fetchBanners();
      } else {
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión guardando el banner.");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[calc(100vh-1.5rem)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-ink">{zona ? zonaLabel : "Nueva zona personalizada"}</h2>
            {zona && <p className="text-xs text-muted">Tamaño recomendado: {sizeLabel}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-ink text-2xl leading-none transition-colors">&times;</button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {screen === "list" ? (
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted">Cargando...</p>
              ) : banners.length === 0 ? (
                <p className="text-sm text-muted">Todavía no hay banners en esta zona.</p>
              ) : (
                <div className="space-y-2">
                  {banners.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                      <div className="w-16 h-12 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                        {b.imagen_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.imagen_url} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted px-1 text-center">HTML</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-ink truncate">{b.nombre || "(sin nombre)"}</p>
                      </div>
                      <button
                        onClick={() => toggleActivo(b)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-full shrink-0 ${
                          b.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {b.activo ? "Activo" : "Pausado"}
                      </button>
                      <button
                        onClick={() => editar(b)}
                        className="px-3 py-1.5 text-sm font-medium text-ink bg-gray-100 hover:bg-gray-200 rounded transition-colors shrink-0"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => eliminar(b)}
                        className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={empezarNuevo}
                className="w-full px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
              >
                + Agregar banner
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {!zona && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Zona</label>
                  <input
                    value={form.zonaCustom}
                    onChange={(e) => setForm((f) => ({ ...f, zonaCustom: e.target.value }))}
                    placeholder="nombre-de-la-zona (ej: footer)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  Nombre interno
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Ferretería El Tornillo — agosto"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={tipoContenido === "imagen"} onChange={() => setTipoContenido("imagen")} />
                    Imagen
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={tipoContenido === "html"} onChange={() => setTipoContenido("html")} />
                    Código HTML (AdSense, etc.)
                  </label>
                </div>

                {tipoContenido === "imagen" ? (
                  <div className="space-y-2">
                    {form.imagen_url ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.imagen_url} alt="" className="h-16 rounded border border-gray-200 object-contain bg-gray-50" />
                        <button
                          type="button"
                          onClick={() => setEditandoImagen(true)}
                          className="text-sm text-blue-600 hover:underline font-medium"
                        >
                          Editar imagen
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditandoImagen(true)}
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        📁 Cargar imagen ({sizeLabel})
                      </button>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={form.codigo_html}
                    onChange={(e) => setForm((f) => ({ ...f, codigo_html: e.target.value }))}
                    placeholder="<script>...</script> o el snippet que te dio el anunciante"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-accent"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                  Link de destino (opcional, solo aplica si es imagen)
                </label>
                <input
                  value={form.url_destino}
                  onChange={(e) => setForm((f) => ({ ...f, url_destino: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    Desde (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                    Hasta (opcional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fecha_fin}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                Activo
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : form.id ? "💾 Guardar cambios" : "+ Crear banner"}
                </button>
                {zona && (
                  <button
                    onClick={() => setScreen("list")}
                    className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-ink hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ← Volver
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <BannerImageModal
        isOpen={editandoImagen}
        aspectRatio={aspectRatio}
        sizeLabel={sizeLabel}
        initialImageUrl={form.imagen_url || null}
        onApply={(url) => {
          setForm((f) => ({ ...f, imagen_url: url }));
          setEditandoImagen(false);
        }}
        onClose={() => setEditandoImagen(false)}
      />
    </div>,
    document.body
  );
}
