"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditorModal from "../EditorModal";
import SeccionSelect from "../_lib/SeccionSelect";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import type { Editable } from "../_lib/types";
import AvisoLimite from "../_lib/AvisoLimite";

type Props = {
  initialItems: Editable[];
  secciones: string[];
  total: number;
};

export default function PendientesTab({ initialItems, secciones, total }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<Array<string | number>>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [customSecciones, setCustomSecciones] = useState(secciones);

  // La sección con la que llegó cada nota (la que sugirió la IA), para mostrarla como sugerencia.
  const [sugeridas] = useState(() => new Map(initialItems.map((n) => [n.id, n.seccion || "Local"])));

  const updateItemFields = (id: string | number, patch: Partial<Editable>) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  };

  const withSaving = async (id: string | number, task: () => Promise<void>) => {
    setSavingIds((prev) => [...prev, id]);
    try {
      await task();
    } finally {
      setSavingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const quitarDeLista = (id: string | number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) setEditingId(null);
    router.refresh(); // actualiza los contadores del menú
  };

  const publicar = (item: Editable) =>
    withSaving(item.id, async () => {
      const r = await adminFetch("/api/publicar", {
        method: "POST",
        json: { id: item.id, titulo: item.titulo, cuerpo: item.cuerpo, imagen_url: item.imagen_url },
      });
      if (!r.ok) {
        toast(`No se pudo publicar: ${r.error}`);
        return;
      }
      quitarDeLista(item.id);
    });

  const descartar = (item: Editable) =>
    withSaving(item.id, async () => {
      const r = await adminFetch(`/api/noticias/${item.id}`, { method: "DELETE" });
      if (!r.ok) {
        toast(`No se pudo descartar: ${r.error}`);
        return;
      }
      quitarDeLista(item.id);
    });

  /** Guarda la edición en el servidor (antes solo vivía en memoria hasta publicar y se perdía al recargar). */
  const guardarEdicion = (item: Editable, titulo: string, cuerpo: string, imagenUrl: string | null) => {
    const anterior = { titulo: item.titulo, cuerpo: item.cuerpo, imagen_url: item.imagen_url };
    updateItemFields(item.id, { titulo, cuerpo, imagen_url: imagenUrl });
    withSaving(item.id, async () => {
      const r = await adminFetch(`/api/noticias/${item.id}`, {
        method: "PATCH",
        json: { titulo, cuerpo, imagen_url: imagenUrl },
      });
      if (!r.ok) {
        updateItemFields(item.id, anterior);
        toast(`No se pudo guardar la edición: ${r.error}`);
      }
    });
  };

  const cambiarSeccion = (item: Editable, nuevaSeccion: string) => {
    const anterior = item.seccion;
    updateItemFields(item.id, { seccion: nuevaSeccion });
    withSaving(item.id, async () => {
      const r = await adminFetch(`/api/noticias/${item.id}/seccion`, {
        method: "PATCH",
        json: { seccion: nuevaSeccion },
      });
      if (!r.ok) {
        updateItemFields(item.id, { seccion: anterior });
        toast(`No se pudo cambiar la sección: ${r.error}`);
      }
    });
  };

  const renderPendienteCard = (item: Editable) => {
    const saving = savingIds.includes(item.id);
    const isEditing = editingId === item.id;
    const sugerida = sugeridas.get(item.id);

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

            <div className="mt-1">
              <SeccionSelect
                value={item.seccion}
                secciones={customSecciones}
                onChange={(sec) => cambiarSeccion(item, sec)}
                onCrear={(sec) => setCustomSecciones((prev) => [...prev, sec])}
              >
                {sugerida && (
                  <div className="text-[10px] text-muted flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Sugerencia: <strong className="text-blue-700">{sugerida}</strong>
                  </div>
                )}
              </SeccionSelect>
            </div>
          </div>

          <div className="mt-1">
            <h3 className="font-editorial text-xl font-bold text-ink">{item.titulo}</h3>
            <p className="text-sm text-muted mt-2 line-clamp-2 leading-relaxed">{item.cuerpo}</p>
          </div>

          {/* Fuentes originales usadas por la IA */}
          {item.fuentes_urls && item.fuentes_urls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.fuentes_urls.map((f, idx) => (
                <a
                  key={`${item.id}-fuente-${idx}`}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors"
                >
                  🔗 {f.fuente || "Ver fuente"}
                </a>
              ))}
            </div>
          ) : item.url_original ? (
            <div className="mt-3">
              <a
                href={item.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors inline-block"
              >
                🔗 Ver artículo original
              </a>
            </div>
          ) : null}

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
              onClick={() => setEditingId(item.id)}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 bg-ink text-white hover:bg-ink/80"
            >
              ✏️ Editar
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
              guardarEdicion(item, titulo, cuerpo, imagenUrl);
              setEditingId(null);
            }}
          />
        )}
      </article>
    );
  };

  const itemsPropios = items.filter((i) => i.origen === "redaccion");
  const itemsResto = items.filter((i) => i.origen !== "redaccion");

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-ink">Revisión Editorial</h2>
      </div>

      <AvisoLimite mostrados={initialItems.length} total={total} cosa="pendientes" />

      {items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-border border-dashed">
          <span className="text-4xl">☕</span>
          <h3 className="text-lg font-bold mt-4">Todo al día</h3>
          <p className="text-muted mt-1">No hay noticias pendientes de revisión.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itemsPropios.length > 0 && (
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-bold text-accent uppercase tracking-wide flex items-center gap-2">
                ✨ Producción propia
              </h3>
              {itemsPropios.map(renderPendienteCard)}
            </div>
          )}
          {itemsResto.length > 0 && itemsPropios.length > 0 && (
            <h3 className="text-sm font-bold text-muted uppercase tracking-wide mb-4">Bandeja general</h3>
          )}
          {itemsResto.map(renderPendienteCard)}
        </div>
      )}
    </div>
  );
}
