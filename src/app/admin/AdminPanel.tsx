"use client";

import { useMemo, useState } from "react";
import type { Noticia } from "@/types/noticia";

type Editable = Pick<Noticia, "id" | "titulo" | "cuerpo" | "seccion">;

type Props = {
  initialItems: Editable[];
};

export default function AdminPanel({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [savingIds, setSavingIds] = useState<number[]>([]);

  const hasItems = useMemo(() => items.length > 0, [items]);

  const updateItem = (id: number, field: "titulo" | "cuerpo", value: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const withSaving = async (id: number, task: () => Promise<void>) => {
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
    });

  return (
    <section className="space-y-4">
      <h1 className="font-serif text-3xl">Admin · Pendientes</h1>
      {!hasItems && <p>No hay noticias pendientes.</p>}
      {items.map((item) => {
        const saving = savingIds.includes(item.id);
        return (
          <article key={item.id} className="border border-[#0f0f0f]/20 p-4 bg-white space-y-3">
            <p className="text-xs uppercase text-[#c8102e]">{item.seccion}</p>
            <input
              value={item.titulo}
              onChange={(e) => updateItem(item.id, "titulo", e.target.value)}
              className="w-full border border-[#0f0f0f]/25 p-2 font-serif text-xl"
            />
            <textarea
              value={item.cuerpo}
              onChange={(e) => updateItem(item.id, "cuerpo", e.target.value)}
              rows={5}
              className="w-full border border-[#0f0f0f]/25 p-2 text-sm"
            />
            <p className="text-xs text-[#0f0f0f]/70">
              Preview: {item.cuerpo.slice(0, 180)}
              {item.cuerpo.length > 180 ? "..." : ""}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => publicar(item)}
                disabled={saving}
                className="px-3 py-1 bg-[#0f0f0f] text-[#f8f6f1] disabled:opacity-60"
              >
                Publicar
              </button>
              <button
                type="button"
                onClick={() => publicar(item)}
                disabled={saving}
                className="px-3 py-1 border border-[#0f0f0f]"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => descartar(item)}
                disabled={saving}
                className="px-3 py-1 bg-[#c8102e] text-[#f8f6f1] disabled:opacity-60"
              >
                Descartar
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
