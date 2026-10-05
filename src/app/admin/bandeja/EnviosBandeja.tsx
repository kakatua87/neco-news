"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { ESTADOS_ACTIVOS, type BorradorEnvio, type Envio } from "../_lib/envios";

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

const CATEGORIAS = ["Denuncia", "Dato/Info", "Evento", "Otro"];

function agruparPorDia(envios: Envio[]): [string, Envio[]][] {
  const grupos = new Map<string, Envio[]>();
  for (const e of envios) {
    const key = new Date(e.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(e);
  }
  return Array.from(grupos.entries());
}

type Props = {
  envios: Envio[];
  setEnvios: Dispatch<SetStateAction<Envio[]>>;
};

/** Bloque "Ciudadanos" de la bandeja: envíos de la gente desde el botón flotante de la web. */
export default function EnviosBandeja({ envios, setEnvios }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [verHistorial, setVerHistorial] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editMensaje, setEditMensaje] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [generandoId, setGenerandoId] = useState<string | null>(null);
  const [creandoId, setCreandoId] = useState<string | null>(null);
  const [borradorEdit, setBorradorEdit] = useState<Record<string, BorradorEnvio>>({});

  const visibles = useMemo(
    () => envios.filter((e) => ESTADOS_ACTIVOS.includes(e.estado) !== verHistorial),
    [envios, verHistorial]
  );
  const historialCount = envios.length - envios.filter((e) => ESTADOS_ACTIVOS.includes(e.estado)).length;
  const grupos = useMemo(() => agruparPorDia(visibles), [visibles]);

  const actualizar = (id: string, patch: Partial<Envio>) =>
    setEnvios((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const iniciarEdicion = (envio: Envio) => {
    setEditandoId(envio.id);
    setEditMensaje(envio.mensaje);
    setEditCategoria(envio.categoria);
  };

  const guardarEdicion = async (id: string) => {
    const r = await adminFetch(`/api/tips/${id}`, { method: "PATCH", json: { mensaje: editMensaje, categoria: editCategoria } });
    if (!r.ok) {
      toast(`No se pudo guardar el mensaje: ${r.error}`);
      return;
    }
    actualizar(id, { mensaje: editMensaje, categoria: editCategoria });
    setEditandoId(null);
  };

  const descartar = async (id: string) => {
    if (!confirm("¿Descartar este envío?")) return;
    const r = await adminFetch(`/api/tips/${id}`, { method: "PATCH", json: { estado: "descartada" } });
    if (!r.ok) {
      toast(`No se pudo descartar el envío: ${r.error}`);
      return;
    }
    actualizar(id, { estado: "descartada" });
    router.refresh(); // actualiza el contador del menú
  };

  const generarConIA = async (id: string) => {
    setGenerandoId(id);
    const r = await adminFetch<BorradorEnvio>(`/api/tips/${id}/generar-ia`, { method: "POST" });
    setGenerandoId(null);
    if (!r.ok || !r.data) {
      toast(r.error || "No se pudo generar la nota");
      return;
    }
    const borrador = r.data;
    actualizar(id, { borrador, estado: "en_revision" });
    setBorradorEdit((prev) => ({ ...prev, [id]: borrador }));
  };

  const crearComoPendiente = async (id: string, borrador: BorradorEnvio) => {
    setCreandoId(id);
    const r = await adminFetch<{ noticia_id: string }>(`/api/tips/${id}/crear-noticia`, { method: "POST", json: { borrador } });
    setCreandoId(null);
    if (!r.ok || !r.data) {
      toast(r.error || "No se pudo crear la noticia");
      return;
    }
    actualizar(id, { estado: "procesada", noticia_id: r.data.noticia_id });
    toast("Listo: la nota está en Pendientes.", "ok");
    router.refresh();
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-ink">Envíos ciudadanos</h3>
          <p className="text-xs text-muted">Avisos, fotos, videos y PDF que la gente mandó desde el botón flotante de la web.</p>
        </div>
        <button
          onClick={() => setVerHistorial((v) => !v)}
          className="px-3 py-1.5 text-xs font-medium border border-border rounded-full hover:bg-gray-50 transition-colors"
        >
          {verHistorial ? "← Volver a los activos" : `Ver historial (${historialCount})`}
        </button>
      </div>

      {visibles.length === 0 && (
        <p className="text-sm text-muted bg-white rounded-xl border border-dashed border-border px-4 py-8 text-center">
          {verHistorial ? "Todavía no hay envíos procesados ni descartados." : "No hay envíos esperando revisión."}
        </p>
      )}

      {grupos.map(([fecha, items]) => (
        <div key={fecha} className="space-y-4">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wide">{fecha}</h4>
          {items.map((envio) => {
            const borrador = borradorEdit[envio.id] ?? envio.borrador ?? undefined;
            return (
              <div key={envio.id} className="bg-white rounded-xl border border-amber-200 shadow-sm p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Ciudadano</span>
                    <span className="text-xs font-semibold text-accent">{envio.categoria}</span>
                    {envio.nombre && <span className="text-xs text-muted">· {envio.nombre}</span>}
                    {envio.telefono && <span className="text-xs text-muted">· {envio.telefono}</span>}
                    <span className="text-xs text-muted">
                      · {new Date(envio.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                    </span>
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
                      {CATEGORIAS.map((c) => (
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
                      onChange={(e) => setBorradorEdit((prev) => ({ ...prev, [envio.id]: { ...borrador, titulo: e.target.value } }))}
                      className="w-full border border-border-strong rounded-lg px-3 py-2 text-sm font-bold"
                    />
                    <textarea
                      value={borrador.cuerpo}
                      onChange={(e) => setBorradorEdit((prev) => ({ ...prev, [envio.id]: { ...borrador, cuerpo: e.target.value } }))}
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

                {ESTADOS_ACTIVOS.includes(envio.estado) && editandoId !== envio.id && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => iniciarEdicion(envio)} className="text-sm text-blue-600 hover:underline">
                      Editar mensaje
                    </button>
                    <button
                      disabled={generandoId === envio.id}
                      onClick={() => generarConIA(envio.id)}
                      className="text-sm font-bold text-accent hover:underline disabled:opacity-50"
                    >
                      {generandoId === envio.id ? "Procesando..." : borrador ? "⚡ Procesar de nuevo con IA" : "⚡ Procesar con IA"}
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
    </section>
  );
}
