"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EditorModal from "../EditorModal";
import SeccionSelect from "../_lib/SeccionSelect";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useToggleSet } from "../_lib/useToggleSet";
import { useNoticiaLink } from "../_lib/useNoticiaLink";
import type { Editable } from "../_lib/types";
import AvisoLimite from "../_lib/AvisoLimite";
import { agruparPorMesYDia } from "@/lib/fechas";
import { SECCIONES_SOLO_FILTRO_DIRECTO } from "@/lib/secciones";

type Props = {
  initialItems: Editable[];
  secciones: string[];
  total: number;
};

const claveMes = (iso?: string) => {
  const fecha = iso ? new Date(iso) : null;
  if (!fecha || isNaN(fecha.getTime())) return null;
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
};

export default function PublicadasTab({ initialItems, secciones, total }: Props) {
  const router = useRouter();
  const toast = useToast();
  const noticiaLink = useNoticiaLink();

  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [seccionFiltro, setSeccionFiltro] = useState("Todas");
  const [customSecciones, setCustomSecciones] = useState(secciones);
  const [seleccionadas, toggleSeleccion, setSeleccionadas] = useToggleSet<string | number>();
  // Por defecto se expande el mes de la nota más reciente.
  const mesInicial = claveMes(initialItems.find((n) => n.fecha_publicacion)?.fecha_publicacion);
  const [mesesExpandidos, toggleMes] = useToggleSet<string>(mesInicial ? [mesInicial] : []);
  // Días COLAPSADOS (vacío = todos expandidos dentro de su mes).
  const [diasColapsados, toggleDia] = useToggleSet<string>();

  const visibles = useMemo(
    () =>
      items.filter((n) =>
        seccionFiltro === "Todas"
          ? !SECCIONES_SOLO_FILTRO_DIRECTO.includes(n.seccion)
          : n.seccion === seccionFiltro
      ),
    [items, seccionFiltro]
  );
  const agrupadas = useMemo(() => agruparPorMesYDia(visibles), [visibles]);

  // ─── Acciones ──────────────────────────────────────────────────
  const cambiarSeccion = async (item: Editable, nuevaSeccion: string) => {
    const anterior = item.seccion;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, seccion: nuevaSeccion } : n)));
    const r = await adminFetch(`/api/noticias/${item.id}/seccion`, { method: "PATCH", json: { seccion: nuevaSeccion } });
    if (!r.ok) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, seccion: anterior } : n)));
      toast(`No se pudo cambiar la sección: ${r.error}`);
    }
  };

  const guardarEdicion = async (id: string | number, titulo: string, cuerpo: string, imagenUrl: string | null) => {
    const anterior = items.find((n) => n.id === id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, titulo, cuerpo, imagen_url: imagenUrl } : n)));
    const r = await adminFetch(`/api/noticias/${id}`, { method: "PATCH", json: { titulo, cuerpo, imagen_url: imagenUrl } });
    if (!r.ok) {
      if (anterior) setItems((prev) => prev.map((n) => (n.id === id ? anterior : n)));
      toast(`No se pudo guardar la edición: ${r.error}`);
    }
  };

  /** Borra en el servidor y, si falla, vuelve a mostrar las notas en la lista. */
  const eliminarIds = async (ids: Array<string | number>, url: string, init: Parameters<typeof adminFetch>[1]) => {
    const respaldo = items.filter((n) => ids.includes(n.id));
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    const r = await adminFetch(url, init);
    if (!r.ok) {
      setItems((prev) =>
        [...prev, ...respaldo].sort((a, b) => (b.fecha_publicacion ?? "").localeCompare(a.fecha_publicacion ?? ""))
      );
      toast(`No se pudo eliminar: ${r.error}`);
      return false;
    }
    router.refresh();
    return true;
  };

  const eliminarPublicada = async (id: string | number) => {
    if (!confirm("¿Seguro que quieres eliminar esta noticia? Esta acción no se puede deshacer.")) return;
    await eliminarIds([id], `/api/noticias/${id}?permanente=true`, { method: "DELETE" });
  };

  const despublicar = async (id: string | number) => {
    if (!confirm("¿Despublicar esta noticia? Deja de verse en el portal y vuelve a Pendientes.")) return;
    const ok = await eliminarIds([id], `/api/noticias/${id}/estado`, { method: "POST", json: { estado: "pendiente" } });
    if (ok) toast("Noticia devuelta a Pendientes.", "ok");
  };

  const eliminarMultiple = (ids: Array<string | number>) =>
    eliminarIds(ids, "/api/noticias/eliminar-multiple", { method: "POST", json: { ids } });

  const eliminarSeleccionadas = async () => {
    if (seleccionadas.size === 0) return;
    const n = seleccionadas.size;
    if (!confirm(`¿Eliminar ${n} noticia${n !== 1 ? "s" : ""} publicada${n !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`)) return;
    const ids = Array.from(seleccionadas);
    setSeleccionadas(new Set());
    await eliminarMultiple(ids);
  };

  const eliminarTodasDeSeccion = async () => {
    if (visibles.length === 0) return;
    if (!confirm(`¿Eliminar TODAS las noticias de "${seccionFiltro}" (${visibles.length})? Esta acción no se puede deshacer.`)) return;
    setSeleccionadas(new Set());
    await eliminarMultiple(visibles.map((n) => n.id));
  };

  const seleccionarTodas = () =>
    setSeleccionadas((prev) =>
      visibles.every((n) => prev.has(n.id)) ? new Set() : new Set(visibles.map((n) => n.id))
    );

  const marcarPortada = async (id: string | number) => {
    const item = items.find((n) => n.id === id);
    const yaEstaba = !!item?.es_portada;
    const maxOrden = Math.max(0, ...items.filter((n) => n.es_portada).map((n) => n.orden_portada || 0));
    const aplicar = (esPortada: boolean, orden: number | null) =>
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, es_portada: esPortada, orden_portada: orden } : n)));

    aplicar(!yaEstaba, yaEstaba ? null : maxOrden + 1);
    const r = await adminFetch(`/api/noticias/${id}/portada`, { method: "POST" });
    if (!r.ok) {
      aplicar(yaEstaba, item?.orden_portada ?? null);
      toast(`No se pudo actualizar la portada: ${r.error}`);
    }
  };

  const filtroCls = (activo: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
      activo ? "bg-ink text-white border-ink" : "bg-white text-muted border-border hover:bg-gray-50"
    }`;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold text-ink">Noticias Publicadas</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibles.length > 0 && visibles.every((n) => seleccionadas.has(n.id))}
              onChange={seleccionarTodas}
              className="w-4 h-4 accent-accent"
            />
            Seleccionar visibles
          </label>
          <button
            onClick={eliminarSeleccionadas}
            disabled={seleccionadas.size === 0}
            className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-40"
          >
            🗑 Eliminar seleccionadas ({seleccionadas.size})
          </button>
          {seccionFiltro !== "Todas" && (
            <button
              onClick={eliminarTodasDeSeccion}
              className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              🗑 Eliminar todas de &quot;{seccionFiltro}&quot;
            </button>
          )}
        </div>
      </div>

      <AvisoLimite mostrados={initialItems.length} total={total} cosa="noticias publicadas" />

      {/* Filtros por sección */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setSeccionFiltro("Todas")} className={filtroCls(seccionFiltro === "Todas")}>
          Todas
        </button>
        {customSecciones.map((sec) => (
          <button key={sec} onClick={() => setSeccionFiltro(sec)} className={filtroCls(seccionFiltro === sec)}>
            {sec}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {agrupadas.map((mes) => {
          const expandido = mesesExpandidos.has(mes.key);
          const totalMes = mes.dias.reduce((acc, d) => acc + d.items.length, 0);
          return (
            <div key={mes.key} className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggleMes(mes.key)}
                className="w-full flex justify-between items-center px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-bold text-ink">{mes.label}</span>
                <span className="flex items-center gap-3 text-sm text-muted">
                  {totalMes} noticia{totalMes !== 1 ? "s" : ""}
                  <span className={`inline-block transition-transform ${expandido ? "rotate-180" : ""}`}>▾</span>
                </span>
              </button>

              {expandido && (
                <div className="p-5 space-y-8">
                  {mes.dias.map((dia) => {
                    const diaColapsado = diasColapsados.has(dia.key);
                    return (
                      <div key={dia.key}>
                        <button
                          onClick={() => toggleDia(dia.key)}
                          className="flex items-center gap-2 mb-3 hover:opacity-70 transition-opacity"
                        >
                          <span className={`inline-block transition-transform text-muted ${diaColapsado ? "" : "rotate-180"}`}>▾</span>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">{dia.label}</h4>
                          <span className="text-xs text-muted normal-case">({dia.items.length})</span>
                        </button>
                        {!diaColapsado && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {dia.items.map((item) => {
                              const isEditing = editingId === item.id;
                              return (
                                <article key={item.id} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                                  <div className="h-40 bg-gray-100 flex-shrink-0 relative">
                                    {item.imagen_url ? (
                                      <img src={item.imagen_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">Sin foto</div>
                                    )}
                                    {item.es_portada && (
                                      <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded shadow-sm">
                                        ⭐ Portada #{item.orden_portada ?? ""}
                                      </div>
                                    )}
                                    <label className="absolute top-2 left-2 bg-white/90 rounded-md p-1 cursor-pointer shadow-sm">
                                      <input
                                        type="checkbox"
                                        checked={seleccionadas.has(item.id)}
                                        onChange={() => toggleSeleccion(item.id)}
                                        className="w-4 h-4 accent-accent"
                                      />
                                    </label>
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
                                      <SeccionSelect
                                        compacto
                                        value={item.seccion}
                                        secciones={customSecciones}
                                        onChange={(sec) => cambiarSeccion(item, sec)}
                                        onCrear={(sec) => setCustomSecciones((prev) => [...prev, sec])}
                                      />
                                    </div>
                                    <h3 className="font-editorial text-lg font-bold text-ink leading-tight line-clamp-3 mb-4">{item.titulo}</h3>

                                    <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-2">
                                      <div className="flex gap-2">
                                        <a
                                          href={noticiaLink(item)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-ink bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                        >
                                          🔗 Ver en el sitio
                                        </a>
                                        <button
                                          onClick={() => setEditingId(item.id)}
                                          className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-ink hover:bg-ink/80 rounded transition-colors"
                                        >
                                          ✏️ Editar
                                        </button>
                                      </div>
                                      <div className="flex gap-2 justify-between items-center">
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => despublicar(item.id)}
                                            className="px-3 py-1.5 text-sm font-medium text-muted hover:bg-gray-100 rounded transition-colors"
                                            title="Sacarla del portal y devolverla a Pendientes"
                                          >
                                            Despublicar
                                          </button>
                                          <button
                                            onClick={() => eliminarPublicada(item.id)}
                                            className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors"
                                          >
                                            Eliminar
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => marcarPortada(item.id)}
                                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                                            item.es_portada ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-ink hover:bg-gray-200"
                                          }`}
                                        >
                                          {item.es_portada ? `⭐ En carrusel #${item.orden_portada ?? ""}` : "⭐ Agregar a portada"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {isEditing && (
                                    <EditorModal
                                      isOpen={isEditing}
                                      noticiaId={item.id}
                                      titulo={item.titulo}
                                      cuerpo={item.cuerpo}
                                      seccion={item.seccion}
                                      imagenUrl={item.imagen_url}
                                      onClose={() => setEditingId(null)}
                                      onSave={(titulo, cuerpo, imagenUrl) => {
                                        guardarEdicion(item.id, titulo, cuerpo, imagenUrl);
                                        setEditingId(null);
                                      }}
                                    />
                                  )}
                                </article>
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

        {items.length === 0 && (
          <div className="text-center py-12 text-muted">No hay noticias publicadas para mostrar.</div>
        )}
      </div>
    </div>
  );
}
