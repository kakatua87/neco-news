"use client";

import { useEffect, useRef, useState } from "react";

type Borrador = {
  id: string;
  titulo: string;
  seccion: string;
  estado: "borrador" | "procesado";
  imagen_portada_url: string | null;
  noticia_id: string | null;
  updated_at: string;
};

const SECCIONES = [
  "Política", "Economía", "Policiales", "Local",
  "Deportes", "Sociedad", "Salud", "Cultura",
  "Tecnología", "Educación",
];

export default function RedaccionPanel() {
  const [borradores, setBorradores] = useState<Borrador[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [borradorId, setBorradorId] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [seccion, setSeccion] = useState("Local");
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState<string | null>(null);

  const [subiendoPortada, setSubiendoPortada] = useState(false);
  const [subiendoInline, setSubiendoInline] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const fetchBorradores = async () => {
    setCargandoLista(true);
    try {
      const res = await fetch("/api/borradores");
      const data = await res.json();
      if (res.ok && data.ok) setBorradores(data.borradores || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    fetchBorradores();
    if (typeof document !== "undefined") {
      document.execCommand("defaultParagraphSeparator", false, "p");
    }
  }, []);

  const nuevoBorrador = () => {
    setBorradorId(null);
    setTitulo("");
    setSeccion("Local");
    setImagenPortadaUrl(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
    setMensaje(null);
    setError(null);
  };

  const abrirBorrador = async (id: string) => {
    setError(null);
    setMensaje(null);
    try {
      const res = await fetch(`/api/borradores/${id}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo abrir el borrador");
        return;
      }
      const b = data.borrador;
      setBorradorId(b.id);
      setTitulo(b.titulo || "");
      setSeccion(b.seccion || "Local");
      setImagenPortadaUrl(b.imagen_portada_url || null);
      if (editorRef.current) editorRef.current.innerHTML = b.contenido_html || "";
    } catch (e) {
      console.error(e);
      setError("No se pudo abrir el borrador");
    }
  };

  const subirPortada = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setSubiendoPortada(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/borradores/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo subir la imagen de portada");
        return;
      }
      setImagenPortadaUrl(data.url);
    } finally {
      setSubiendoPortada(false);
    }
  };

  const insertarImagenInline = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setSubiendoInline(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/borradores/subir-imagen", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo subir la imagen");
        return;
      }
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<p><img src="${data.url}" style="max-width:100%;border-radius:8px" /></p><p><br></p>`
      );
    } finally {
      setSubiendoInline(false);
    }
  };

  const comando = (cmd: string, valor?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, valor);
  };

  const guardarBorrador = async (): Promise<string | null> => {
    setGuardando(true);
    setError(null);
    const contenido_html = editorRef.current?.innerHTML || "";
    try {
      if (borradorId) {
        const res = await fetch(`/api/borradores/${borradorId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, contenido_html, imagen_portada_url: imagenPortadaUrl, seccion }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "No se pudo guardar el borrador");
          return null;
        }
        setMensaje("Borrador guardado.");
        fetchBorradores();
        return borradorId;
      } else {
        const res = await fetch("/api/borradores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ titulo, contenido_html, imagen_portada_url: imagenPortadaUrl, seccion }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "No se pudo guardar el borrador");
          return null;
        }
        setBorradorId(data.id);
        setMensaje("Borrador guardado.");
        fetchBorradores();
        return data.id;
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminarBorrador = async (id: string) => {
    if (!confirm("¿Eliminar este borrador?")) return;
    const res = await fetch(`/api/borradores/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (id === borradorId) nuevoBorrador();
      fetchBorradores();
    }
  };

  const procesarConIA = async () => {
    setError(null);
    setMensaje(null);
    const id = await guardarBorrador();
    if (!id) return;

    setProcesando(true);
    try {
      const res = await fetch(`/api/borradores/${id}/procesar-ia`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo procesar con IA");
        return;
      }
      nuevoBorrador();
      setMensaje("¡Lista! La nota quedó creada en Pendientes, en el grupo \"Producción propia\".");
      fetchBorradores();
    } catch (e) {
      console.error(e);
      setError("No se pudo procesar con IA");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fade-in flex flex-col md:flex-row gap-6 max-w-6xl">
      <aside className="w-full md:w-64 flex-shrink-0 space-y-3">
        <button
          onClick={nuevoBorrador}
          className="w-full bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg px-3 py-2"
        >
          ➕ Nuevo borrador
        </button>
        <div className="bg-white rounded-xl border border-border shadow-sm divide-y divide-border max-h-[70vh] overflow-y-auto">
          {cargandoLista && <p className="text-sm text-muted p-3">Cargando...</p>}
          {!cargandoLista && borradores.length === 0 && (
            <p className="text-sm text-muted p-3">Todavía no hay borradores.</p>
          )}
          {borradores.map((b) => (
            <div
              key={b.id}
              className={`p-3 cursor-pointer hover:bg-gray-50 ${b.id === borradorId ? "bg-accent/5" : ""}`}
              onClick={() => abrirBorrador(b.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink line-clamp-2">{b.titulo || "(sin título)"}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarBorrador(b.id);
                  }}
                  className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                >
                  🗑️
                </button>
              </div>
              <p className="text-xs text-muted mt-1">
                {b.estado === "procesado" ? "✅ Procesado" : "📝 Borrador"} · {b.seccion}
              </p>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 space-y-4">
        <h2 className="text-2xl font-bold text-ink">Redacción propia</h2>

        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la nota"
          className="w-full border border-border-strong rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:border-accent"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            className="text-sm border border-border rounded-lg px-2 py-1.5 bg-gray-50"
          >
            {SECCIONES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="text-sm text-blue-600 hover:underline cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => subirPortada(e.target.files)}
            />
            {subiendoPortada ? "Subiendo..." : imagenPortadaUrl ? "🖼️ Cambiar portada" : "🖼️ Agregar imagen de portada"}
          </label>

          {imagenPortadaUrl && (
            <img src={imagenPortadaUrl} alt="" className="h-10 w-16 object-cover rounded border border-border" />
          )}
        </div>

        <div className="border border-border-strong rounded-lg overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap bg-gray-50 border-b border-border px-2 py-1.5">
            <button type="button" onClick={() => comando("formatBlock", "h2")} className="px-2 py-1 text-sm font-bold rounded hover:bg-gray-200">
              H2
            </button>
            <button type="button" onClick={() => comando("formatBlock", "h3")} className="px-2 py-1 text-sm font-bold rounded hover:bg-gray-200">
              H3
            </button>
            <button type="button" onClick={() => comando("formatBlock", "p")} className="px-2 py-1 text-sm rounded hover:bg-gray-200">
              Párrafo
            </button>
            <span className="w-px h-5 bg-border mx-1" />
            <button type="button" onClick={() => comando("insertUnorderedList")} className="px-2 py-1 text-sm rounded hover:bg-gray-200">
              • Lista
            </button>
            <label className="px-2 py-1 text-sm rounded hover:bg-gray-200 cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => insertarImagenInline(e.target.files)} />
              {subiendoInline ? "Subiendo..." : "🖼️ Insertar imagen"}
            </label>
            <span className="w-px h-5 bg-border mx-1" />
            <button type="button" onClick={() => comando("undo")} className="px-2 py-1 text-sm rounded hover:bg-gray-200">
              ↶
            </button>
            <button type="button" onClick={() => comando("redo")} className="px-2 py-1 text-sm rounded hover:bg-gray-200">
              ↷
            </button>
            <button type="button" onClick={() => comando("removeFormat")} className="px-2 py-1 text-sm rounded hover:bg-gray-200">
              Limpiar formato
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[320px] max-h-[520px] overflow-y-auto p-4 text-base leading-relaxed focus:outline-none prose"
          />
        </div>

        <p className="text-xs text-muted">
          El cuerpo publicado admite encabezados, párrafos, listas con viñetas e imágenes (sin negrita/cursiva, para mantener consistencia con el resto del sitio).
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {mensaje && <p className="text-sm text-green-700">{mensaje}</p>}

        <div className="flex gap-3">
          <button
            disabled={guardando}
            onClick={guardarBorrador}
            className="bg-white border border-border-strong hover:bg-gray-50 disabled:opacity-50 text-ink font-medium rounded-lg px-4 py-2 text-sm"
          >
            {guardando ? "Guardando..." : "💾 Guardar borrador"}
          </button>
          <button
            disabled={procesando}
            onClick={procesarConIA}
            className="bg-accent hover:bg-accent-dark disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2 text-sm"
          >
            {procesando ? "Procesando..." : "✨ Procesar con IA"}
          </button>
        </div>
      </div>
    </div>
  );
}
