"use client";

import { useEffect, useState } from "react";

type Archivo = { url: string; tipo: string; nombre: string };
type Borrador = {
  titulo: string;
  cuerpo: string;
  resumen_seo?: string;
  seccion_sugerida?: string;
  instagram_text?: string;
  instagram_titulo?: string;
  twitter_text?: string;
  guion_video?: string;
  slug: string;
};
type Envio = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  categoria: string;
  mensaje: string;
  archivos: Archivo[];
  estado: "nuevo" | "en_revision" | "procesada" | "descartada";
  borrador: Borrador | null;
  noticia_id: string | null;
  created_at: string;
};

const ESTADO_LABEL: Record<Envio["estado"], string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  procesada: "Procesada",
  descartada: "Descartada",
};

const ESTADO_COLOR: Record<Envio["estado"], string> = {
  nuevo: "bg-blue-100 text-blue-700",
  en_revision: "bg-amber-100 text-amber-700",
  procesada: "bg-green-100 text-green-700",
  descartada: "bg-gray-100 text-gray-500",
};

function agruparPorDia(envios: Envio[]): [string, Envio[]][] {
  const grupos = new Map<string, Envio[]>();
  for (const e of envios) {
    const fecha = new Date(e.created_at);
    const key = fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(e);
  }
  return Array.from(grupos.entries());
}

export default function EnviosPanel() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editMensaje, setEditMensaje] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [generandoId, setGenerandoId] = useState<string | null>(null);
  const [creandoId, setCreandoId] = useState<string | null>(null);
  const [borradorEdit, setBorradorEdit] = useState<Record<string, Borrador>>({});

  const fetchEnvios = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tips");
      const data = await res.json();
      if (res.ok && data.ok) setEnvios(data.envios || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvios();
  }, []);

  const iniciarEdicion = (envio: Envio) => {
    setEditandoId(envio.id);
    setEditMensaje(envio.mensaje);
    setEditCategoria(envio.categoria);
  };

  const guardarEdicion = async (id: string) => {
    const res = await fetch(`/api/tips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: editMensaje, categoria: editCategoria }),
    });
    if (res.ok) {
      setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, mensaje: editMensaje, categoria: editCategoria } : e)));
      setEditandoId(null);
    }
  };

  const descartar = async (id: string) => {
    if (!confirm("¿Descartar este envío?")) return;
    const res = await fetch(`/api/tips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "descartada" }),
    });
    if (res.ok) setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, estado: "descartada" } : e)));
  };

  const generarConIA = async (id: string) => {
    setGenerandoId(id);
    try {
      const res = await fetch(`/api/tips/${id}/generar-ia`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, borrador: data, estado: "en_revision" } : e)));
        setBorradorEdit((prev) => ({ ...prev, [id]: data }));
      } else {
        alert(data.error || "No se pudo generar la nota");
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo generar la nota");
    } finally {
      setGenerandoId(null);
    }
  };

  const crearComoPendiente = async (id: string, borrador: Borrador) => {
    setCreandoId(id);
    try {
      const res = await fetch(`/api/tips/${id}/crear-noticia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrador }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, estado: "procesada", noticia_id: data.noticia_id } : e)));
      } else {
        alert(data.error || "No se pudo crear la noticia");
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo crear la noticia");
    } finally {
      setCreandoId(null);
    }
  };

  if (loading) {
    return <p className="text-muted">Cargando envíos...</p>;
  }

  const grupos = agruparPorDia(envios);

  return (
    <div className="space-y-8 fade-in max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-ink mb-1">Envíos ciudadanos</h2>
        <p className="text-sm text-muted">
          Avisos, fotos, videos y PDF que la gente mandó desde el botón flotante de la web.
        </p>
      </div>

      {envios.length === 0 && <p className="text-muted">Todavía no llegó ningún envío.</p>}

      {grupos.map(([fecha, items]) => (
        <div key={fecha} className="space-y-4">
          <h3 className="text-sm font-bold text-muted uppercase tracking-wide">{fecha}</h3>
          {items.map((envio) => {
            const borrador = borradorEdit[envio.id] ?? envio.borrador ?? undefined;
            return (
              <div key={envio.id} className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-accent">{envio.categoria}</span>
                    {envio.nombre && <span className="text-xs text-muted ml-2">· {envio.nombre}</span>}
                    {envio.telefono && <span className="text-xs text-muted ml-2">· {envio.telefono}</span>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_COLOR[envio.estado]}`}>
                    {ESTADO_LABEL[envio.estado]}
                  </span>
                </div>

                {editandoId === envio.id ? (
                  <div className="space-y-2">
                    <select
                      value={editCategoria}
                      onChange={(e) => setEditCategoria(e.target.value)}
                      className="border border-border-strong rounded-lg px-2 py-1 text-sm"
                    >
                      {["Denuncia", "Dato/Info", "Evento", "Otro"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <textarea
                      value={editMensaje}
                      onChange={(e) => setEditMensaje(e.target.value)}
                      rows={4}
                      className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => guardarEdicion(envio.id)}
                        className="bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg px-3 py-1.5"
                      >
                        Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-sm text-muted px-3 py-1.5">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink whitespace-pre-wrap">{envio.mensaje}</p>
                )}

                {envio.archivos?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {envio.archivos.map((a) => (
                      <a
                        key={a.url}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5"
                      >
                        {a.tipo.startsWith("image/") ? "🖼️" : a.tipo.startsWith("video/") ? "🎬" : "📄"} {a.nombre}
                      </a>
                    ))}
                  </div>
                )}

                {borrador && envio.estado !== "procesada" && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-border">
                    <p className="text-xs font-bold text-muted uppercase">Borrador generado por IA</p>
                    <input
                      value={borrador.titulo}
                      onChange={(e) =>
                        setBorradorEdit((prev) => ({ ...prev, [envio.id]: { ...borrador, titulo: e.target.value } }))
                      }
                      className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm font-bold"
                    />
                    <textarea
                      value={borrador.cuerpo}
                      onChange={(e) =>
                        setBorradorEdit((prev) => ({ ...prev, [envio.id]: { ...borrador, cuerpo: e.target.value } }))
                      }
                      rows={8}
                      className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-muted">Sección sugerida: {borrador.seccion_sugerida}</p>
                    <button
                      disabled={creandoId === envio.id}
                      onClick={() => crearComoPendiente(envio.id, borrador)}
                      className="bg-accent hover:bg-accent-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg px-3 py-1.5"
                    >
                      {creandoId === envio.id ? "Creando..." : "Crear como pendiente"}
                    </button>
                  </div>
                )}

                {envio.estado === "procesada" && envio.noticia_id && (
                  <p className="text-sm text-green-700">✅ Convertida en noticia pendiente.</p>
                )}

                {envio.estado !== "descartada" && envio.estado !== "procesada" && editandoId !== envio.id && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => iniciarEdicion(envio)} className="text-sm text-blue-600 hover:underline">
                      Editar
                    </button>
                    <button
                      disabled={generandoId === envio.id}
                      onClick={() => generarConIA(envio.id)}
                      className="text-sm text-accent hover:underline disabled:opacity-50"
                    >
                      {generandoId === envio.id ? "Generando..." : "Generar nota con IA"}
                    </button>
                    <button onClick={() => descartar(envio.id)} className="text-sm text-red-500 hover:underline">
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
