"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Noticia } from "@/types/noticia";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

function normalizeSeccion(s: string): string {
  return s
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "-");
}

const ROTATE_MS = 5000;

export default function HeroCarousel({ items }: { items: Noticia[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [items.length]);

  const hero = items[index] ?? null;

  return (
    <article className="group relative rounded-xl overflow-hidden cursor-pointer card-lift">
      {hero ? (
        <>
          <Link href={`/${normalizeSeccion(hero.seccion)}/${hero.slug}`} className="absolute inset-0 z-20" />
          <div className="relative h-[280px] sm:h-[360px] md:h-[440px] w-full overflow-hidden bg-gray-900">
            {hero.imagen_url ? (
              <img src={hero.imagen_url} alt={hero.titulo} className="w-full h-full object-contain img-zoom" />
            ) : (
              <img src="/placeholder-hero.png" alt="" className="w-full h-full object-contain img-zoom" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <span className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded z-10">
              {hero.seccion}
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
              <h1 className="text-white font-extrabold text-xl md:text-3xl lg:text-4xl leading-[1.12] mb-3">
                {hero.titulo}
              </h1>
              <p className="text-white/60 text-sm">
                Redacción Neco Now • {timeAgo(hero.fecha_publicacion ?? hero.created_at)}
              </p>
            </div>
            {items.length > 1 && (
              <div className="absolute bottom-4 right-4 z-30 flex gap-1.5">
                {items.map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${i === index ? "bg-white w-5" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="relative h-[280px] sm:h-[360px] md:h-[440px] w-full overflow-hidden bg-gray-900 rounded-xl">
          <img src="/placeholder-hero.png" alt="Neco Now" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <span className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded z-10">
            Destacado
          </span>
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
            <h1 className="text-white font-extrabold text-xl md:text-3xl lg:text-4xl leading-[1.12] mb-3">
              Neco Now: Tu portal de noticias de Necochea
            </h1>
            <p className="text-white/60 text-sm">Redacción Neco Now</p>
          </div>
        </div>
      )}
    </article>
  );
}
