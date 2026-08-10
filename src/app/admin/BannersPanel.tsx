"use client";

import { useEffect, useRef, useState } from "react";

type Banner = {
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

type ZonaInfo = { zona: string; label: string; size: string };

const ZONAS_FIJAS: ZonaInfo[] = [
  { zona: "portada", label: "Home — debajo del carrusel principal", size: "Ancho completo × 96–112px · fijo (sin animación)" },
  { zona: "header", label: "Home — debajo de portada + Top Stories", size: "Ancho completo × 96–112px · marquesina" },
  { zona: "sidebar", label: "Home — junto al carrusel, sobre Top Stories", size: "Ancho completo × 128px · marquesina" },
  { zona: "in-article", label: "Dentro de una noticia, después del primer párrafo", size: "Ancho completo × 96px · marquesina" },
];

const emptyForm = {
  id: null as string | null,
  zona: "portada",
  zonaCustom: "",
  nombre: "",
  imagen_url: "",
  url_destino: "",
  codigo_html: "",
  activo: true,
  fecha_inicio: "",
  fecha_fin: "",
};

export default function BannersPanel({ secciones = [] as string[] }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [usarZonaCustom, setUsarZonaCustom] = useState(false);
  const [tipoContenido, setTipoContenido] = useState<"imagen" | "html">("imagen");
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const zonasSecciones: ZonaInfo[] = secciones.map((s) => ({
    zona: `seccion-${s.toLowerCase()}`,
    label: `Sección "${s}" — arriba del listado`,
    size: "Ancho completo × 96–112px · marquesina",
  }));
  const zonasConocidas = [...ZONAS_FIJAS, ...zonasSecciones];

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      if (res.ok) setBanners(data.banners || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setUsarZonaCustom(false);
    setTipoContenido("imagen");
  };

  const editarBanner = (b: Banner) => {
    const zonaEsConocida = zonasConocidas.some((z) => z.zona === b.zona);
    setForm({
      id: b.id,
      zona: zonaEsConocida ? b.zona : "",
      zonaCustom: zonaEsConocida ? "" : b.zona,
      nombre: b.nombre || "",
      imagen_url: b.imagen_url || "",
      url_destino: b.url_destino || "",
      codigo_html: b.codigo_html || "",
      activo: b.activo,
      fecha_inicio: b.fecha_inicio ? b.fecha_inicio.slice(0, 16) : "",
      fecha_fin: b.fecha_fin ? b.fecha_fin.slice(0, 16) : "",
    });
    setUsarZonaCustom(!zonaEsConocida);
    setTipoContenido(b.codigo_html ? "html" : "imagen");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const empezarNuevoEnZona = (zona: string) => {
    resetForm();
    setForm((f) => ({ ...f, zona }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const subirImagen = async (file: File) => {
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/banners/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.imagen_url) {
        setForm((f) => ({ ...f, imagen_url: data.imagen_url }));
      } else {
        alert(`No se pudo subir la imagen: ${data.error || "error desconocido"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión subiendo la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    const zona = (usarZonaCustom ? form.zonaCustom : form.zona).trim();
    if (!zona) {
      alert("Elegí o escribí una zona para el banner.");
      return;
    }
    if (tipoContenido === "imagen" && !form.imagen_url.trim()) {
      alert("Cargá una imagen (por link o desde la PC).");
      return;
    }
    if (tipoContenido === "html" && !form.codigo_html.trim()) {
      alert("Pegá el código HTML del anuncio.");
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        zona,
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
      resetForm();
      fetchBanners();
    } catch (e) {
      console.error(e);
      alert("Error de conexión guardando el banner.");
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (b: Banner) => {
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, activo: !x.activo } : x)));
    const res = await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !b.activo }),
    });
    if (!res.ok) fetchBanners();
  };

  const eliminarBanner = async (b: Banner) => {
    if (!confirm(`¿Eliminar el banner "${b.nombre || b.zona}"?`)) return;
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
    const res = await fetch(`/api/banners/${b.id}`, { method: "DELETE" });
    if (!res.ok) fetchBanners();
  };

  const bannersPorZona = (zona: string) => banners.filter((b) => b.zona === zona);
  const zonasConBanners = Array.from(new Set(banners.map((b) => b.zona))).filter(
    (z) => !zonasConocidas.some((zc) => zc.zona === z)
  );

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      <h2 className="text-2xl font-bold text-ink mb-2">Banners publicitarios</h2>

      {/* MAPA DE LA PÁGINA */}
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="font-bold text-ink mb-1">Mapa de la página — zonas disponibles</h3>
        <p className="text-sm text-muted mb-4">
          Cada zona es un espacio distinto donde puede aparecer un aviso. Podés cargar varios banners en la
          misma zona: rotan de a uno en la marquesina (salvo &quot;portada&quot;, que es fija).
        </p>
        <div className="space-y-2">
          {zonasConocidas.map((z) => {
            const cantidad = bannersPorZona(z.zona).length;
            const activos = bannersPorZona(z.zona).filter((b) => b.activo).length;
            return (
              <div key={z.zona} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-gray-50">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-ink">{z.label}</p>
                  <p className="text-xs text-muted">
                    <code className="bg-gray-200 px-1 rounded">{z.zona}</code> · {z.size}
                    {cantidad > 0 && ` · ${activos}/${cantidad} activo${activos !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <button
                  onClick={() => empezarNuevoEnZona(z.zona)}
                  className="text-sm text-blue-600 hover:underline font-medium shrink-0"
                >
                  + Agregar acá
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-4">
          ¿Necesitás una zona nueva que no esté en esta lista (por ejemplo un &quot;footer&quot;)? Escribila directamente
          en &quot;Zona personalizada&quot; del formulario de abajo. Para que un aviso ahí se vea en el sitio, además hay
          que agregar esa zona en el código de la página correspondiente.
        </p>
      </div>

      {/* FORMULARIO */}
      <div ref={formRef} className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
        <h3 className="font-bold text-ink">{form.id ? "Editar banner" : "Nuevo banner"}</h3>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Zona</label>
          {!usarZonaCustom ? (
            <div className="flex items-center gap-2">
              <select
                value={form.zona}
                onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {zonasConocidas.map((z) => (
                  <option key={z.zona} value={z.zona}>
                    {z.label} ({z.zona})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setUsarZonaCustom(true)}
                className="text-sm text-blue-600 hover:underline font-medium whitespace-nowrap"
              >
                Otra zona...
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={form.zonaCustom}
                onChange={(e) => setForm((f) => ({ ...f, zonaCustom: e.target.value }))}
                placeholder="nombre-de-la-zona (ej: footer)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setUsarZonaCustom(false)}
                className="text-sm text-gray-500 hover:text-ink font-medium whitespace-nowrap"
              >
                Elegir de la lista
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Nombre interno (para identificarlo en esta lista)
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
              {form.imagen_url && (
                <img src={form.imagen_url} alt="" className="h-16 rounded border border-gray-200 object-contain bg-gray-50" />
              )}
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  value={form.imagen_url}
                  onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                  placeholder="https://... URL de la imagen"
                  className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendo}
                  className="text-sm text-blue-600 hover:underline font-medium disabled:opacity-50 whitespace-nowrap"
                >
                  {subiendo ? "Subiendo..." : "📁 Subir desde la PC"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) subirImagen(file);
                    e.target.value = "";
                  }}
                />
              </div>
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
          {form.id && (
            <button
              onClick={resetForm}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-ink hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </div>

      {/* LISTADO */}
      <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
        <h3 className="font-bold text-ink mb-4">Banners cargados</h3>
        {loading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted">Todavía no cargaste ningún banner.</p>
        ) : (
          <div className="space-y-2">
            {banners.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <div className="w-16 h-12 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {b.imagen_url ? (
                    <img src={b.imagen_url} alt="" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted px-1 text-center">HTML</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-ink truncate">{b.nombre || "(sin nombre)"}</p>
                  <p className="text-xs text-muted">
                    <code className="bg-gray-100 px-1 rounded">{b.zona}</code>
                    {zonasConBanners.includes(b.zona) && (
                      <span className="ml-1 text-amber-600">· zona sin placement en el código</span>
                    )}
                  </p>
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
                  onClick={() => editarBanner(b)}
                  className="px-3 py-1.5 text-sm font-medium text-ink bg-gray-100 hover:bg-gray-200 rounded transition-colors shrink-0"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => eliminarBanner(b)}
                  className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
