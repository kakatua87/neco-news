"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useToggleSet } from "../_lib/useToggleSet";
import type { Editable } from "../_lib/types";

export default function ObituariosTab({ initialItems }: { initialItems: Editable[] }) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [seleccionados, toggleSeleccion, setSeleccionados] = useToggleSet<string | number>();

  /** Quita los ids de la lista, los borra en el servidor y los restaura si falla. */
  const eliminar = async (ids: Array<string | number>) => {
    const respaldo = items.filter((n) => ids.includes(n.id));
    setItems((prev) => prev.filter((n) => !ids.includes(n.id)));
    setSeleccionados((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    const r = await adminFetch("/api/noticias/eliminar-multiple", { method: "POST", json: { ids } });
    if (!r.ok) {
      setItems((prev) =>
        [...prev, ...respaldo].sort((a, b) => (b.fecha_publicacion ?? "").localeCompare(a.fecha_publicacion ?? ""))
      );
      toast(`No se pudo eliminar: ${r.error}`);
      return;
    }
    router.refresh();
  };

  const eliminarUno = (id: string | number) => {
    if (!confirm("¿Eliminar este mes de avisos fúnebres? Esta acción no se puede deshacer.")) return;
    return eliminar([id]);
  };

  const eliminarSeleccionados = () => {
    if (seleccionados.size === 0) return;
    const n = seleccionados.size;
    if (!confirm(`¿Eliminar ${n} mes${n !== 1 ? "es" : ""} de avisos fúnebres? Esta acción no se puede deshacer.`)) return;
    return eliminar(Array.from(seleccionados));
  };

  const eliminarTodos = () => {
    if (items.length === 0) return;
    if (!confirm(`¿Eliminar TODOS los avisos fúnebres publicados (${items.length})? Esta acción no se puede deshacer.`)) return;
    return eliminar(items.map((n) => n.id));
  };

  const seleccionarTodas = () =>
    setSeleccionados((prev) => (items.every((n) => prev.has(n.id)) ? new Set() : new Set(items.map((n) => n.id))));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-ink">🕯 Obituarios</h2>
          <p className="text-sm text-muted mt-1">Avisos fúnebres publicados automáticamente, agrupados por mes.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={items.length > 0 && items.every((n) => seleccionados.has(n.id))}
              onChange={seleccionarTodas}
              className="w-4 h-4 accent-accent"
            />
            Seleccionar todas
          </label>
          <button
            onClick={eliminarSeleccionados}
            disabled={seleccionados.size === 0}
            className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-40"
          >
            🗑 Eliminar seleccionadas ({seleccionados.size})
          </button>
          {items.length > 0 && (
            <button
              onClick={eliminarTodos}
              className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              🗑 Eliminar todos
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-5 py-4">
            <input
              type="checkbox"
              checked={seleccionados.has(item.id)}
              onChange={() => toggleSeleccion(item.id)}
              className="w-4 h-4 accent-accent flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-editorial font-bold text-ink truncate">{item.titulo}</p>
              {item.fecha_publicacion && (
                <p className="text-xs text-muted mt-0.5">
                  Actualizado el {new Date(item.fecha_publicacion).toLocaleDateString("es-AR")}
                </p>
              )}
            </div>
            <button
              onClick={() => eliminarUno(item.id)}
              className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              🗑 Eliminar
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-muted">No hay avisos fúnebres publicados todavía.</div>
        )}
      </div>
    </div>
  );
}
