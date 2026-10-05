"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Descartada } from "../_lib/data";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";

type Props = { initialItems: Descartada[]; total: number };

export default function DescartadasTab({ initialItems, total }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [ocupados, setOcupados] = useState<Array<string | number>>([]);
  const [vaciando, setVaciando] = useState(false);
  const [totalActual, setTotalActual] = useState(total);

  const conOcupado = async (id: string | number, tarea: () => Promise<boolean>) => {
    setOcupados((prev) => [...prev, id]);
    const ok = await tarea();
    setOcupados((prev) => prev.filter((x) => x !== id));
    if (ok) {
      setItems((prev) => prev.filter((n) => n.id !== id));
      setTotalActual((t) => Math.max(0, t - 1));
      router.refresh();
    }
  };

  const restaurar = (item: Descartada) =>
    conOcupado(item.id, async () => {
      const r = await adminFetch(`/api/noticias/${item.id}/estado`, { method: "POST", json: { estado: "pendiente" } });
      if (!r.ok) toast(`No se pudo restaurar: ${r.error}`);
      else toast("Restaurada: la encontrás en Pendientes.", "ok");
      return r.ok;
    });

  const eliminar = (item: Descartada) => {
    if (!confirm("¿Eliminar definitivamente esta noticia? Esta acción no se puede deshacer.")) return;
    return conOcupado(item.id, async () => {
      const r = await adminFetch(`/api/noticias/${item.id}?permanente=true`, { method: "DELETE" });
      if (!r.ok) toast(`No se pudo eliminar: ${r.error}`);
      return r.ok;
    });
  };

  const vaciar = async () => {
    if (!confirm(`¿Eliminar definitivamente las ${totalActual} noticias descartadas? Esta acción no se puede deshacer.`)) return;
    setVaciando(true);
    const r = await adminFetch("/api/noticias/vaciar-descartadas", { method: "POST" });
    setVaciando(false);
    if (!r.ok) {
      toast(`No se pudieron vaciar las descartadas: ${r.error}`);
      return;
    }
    setItems([]);
    setTotalActual(0);
    router.refresh();
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink">🗂 Descartadas</h2>
          <p className="text-sm text-muted mt-1">
            {totalActual > items.length
              ? `Mostrando las últimas ${items.length} de ${totalActual}.`
              : `${totalActual} noticia${totalActual !== 1 ? "s" : ""}.`}{" "}
            Restaurar la devuelve a Pendientes. Ojo: las notas que se descartan solas al procesar un grupo con IA ya
            están representadas en la nota final; restaurarlas puede generar duplicados.
          </p>
        </div>
        {totalActual > 0 && (
          <button
            onClick={vaciar}
            disabled={vaciando}
            className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {vaciando ? "Vaciando..." : `🗑 Vaciar todas (${totalActual})`}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm divide-y divide-border">
        {items.map((item) => {
          const ocupado = ocupados.includes(item.id);
          return (
            <div key={item.id} className="flex flex-col md:flex-row md:items-center gap-3 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-editorial font-bold text-ink line-clamp-2">{item.titulo}</p>
                <p className="text-xs text-muted mt-1 flex flex-wrap gap-x-3">
                  <span>{item.seccion}</span>
                  {item.fuente && <span>{item.fuente}</span>}
                  <span>{new Date(item.created_at).toLocaleDateString("es-AR")}</span>
                  {item.url_original && (
                    <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Ver original →
                    </a>
                  )}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => restaurar(item)}
                  disabled={ocupado}
                  className="px-3 py-1.5 text-sm font-medium bg-ink text-white rounded-lg hover:bg-ink/80 transition-colors disabled:opacity-50"
                >
                  ↩ Restaurar
                </button>
                <button
                  onClick={() => eliminar(item)}
                  disabled={ocupado}
                  className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  🗑 Eliminar
                </button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && <div className="text-center py-12 text-muted">No hay noticias descartadas.</div>}
      </div>
    </div>
  );
}
