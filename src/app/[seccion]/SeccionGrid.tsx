"use client";

import { useState } from "react";
import Link from "next/link";
import type { Noticia } from "@/types/noticia";
import { cuerpoPlainText } from "@/lib/cuerpo";

type Props = {
  seccion: string;
  initialNoticias: Noticia[];
  initialHasMore: boolean;
};

export default function SeccionGrid({ seccion, initialNoticias, initialHasMore }: Props) {
  const [noticias, setNoticias] = useState(initialNoticias);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cargando, setCargando] = useState(false);

  const cargarMas = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/noticias/por-seccion?seccion=${encodeURIComponent(seccion)}&offset=${noticias.length}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setNoticias((prev) => [...prev, ...data.noticias]);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {noticias.map((nota) => (
          <article key={nota.id} className="group cursor-pointer card-lift rounded-xl overflow-hidden border border-border">
            <Link href={`/${nota.seccion.toLowerCase()}/${nota.slug}`} className="block h-full flex flex-col">
              <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100 shrink-0">
                {nota.imagen_url ? (
                  <img src={nota.imagen_url} alt={nota.titulo} className="w-full h-full object-cover object-top img-zoom" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <span className="text-accent text-[11px] font-bold uppercase tracking-widest mb-2">{nota.seccion}</span>
                <h2 className="font-editorial text-xl font-bold leading-snug mb-3 title-hover line-clamp-3">
                  {nota.titulo}
                </h2>
                <p className="text-sm text-muted line-clamp-3 mt-auto">
                  {nota.resumen_seo ?? cuerpoPlainText(nota.cuerpo).slice(0, 150) + "..."}
                </p>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {noticias.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted">No se encontraron noticias en esta sección.</p>
        </div>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={cargarMas}
            disabled={cargando}
            className="bg-accent hover:bg-accent-dark disabled:opacity-60 text-white font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-lg transition-colors"
          >
            {cargando ? "Cargando..." : "Cargar más noticias"}
          </button>
        </div>
      )}
    </>
  );
}
