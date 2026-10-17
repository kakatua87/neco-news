"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { urlHttpSegura } from "@/lib/html";

type BannerData = {
  id: string;
  zona: string;
  imagen_url: string | null;
  url_destino: string | null;
  codigo_html: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

/** true si el banner está dentro de su ventana de vigencia (si la tiene). */
function estaVigente(b: BannerData, ahora = new Date()): boolean {
  if (b.fecha_inicio && new Date(b.fecha_inicio) > ahora) return false;
  if (b.fecha_fin && new Date(b.fecha_fin) < ahora) return false;
  return true;
}

/**
 * Cuenta una impresión por banner y por carga de página cuando el espacio estuvo al menos 50% visible
 * durante 1 segundo (criterio estándar de "visible"). Los robots se descartan en el servidor.
 */
function useImpresiones(ids: string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const clave = ids.join(",");

  useEffect(() => {
    const el = ref.current;
    if (!el || !clave || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let enviado = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (enviado) return;
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            enviado = true;
            observer.disconnect();
            fetch("/api/banners/evento", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: clave.split(",") }),
              keepalive: true,
            }).catch(() => {});
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [clave]);

  return ref;
}

function BannerItem({ banner, zone }: { banner: BannerData; zone: string }) {
  if (banner.codigo_html) {
    return (
      <div
        className="h-full flex items-center"
        dangerouslySetInnerHTML={{ __html: banner.codigo_html }}
      />
    );
  }

  if (banner.imagen_url) {
    const imgContent = (
      <img
        src={banner.imagen_url}
        alt={`Banner ${zone}`}
        className="h-full w-auto object-cover rounded-lg"
      />
    );

    const destino = urlHttpSegura(banner.url_destino);
    if (destino) {
      return (
        <a href={`/api/banners/click/${banner.id}`} target="_blank" rel="noopener noreferrer sponsored" className="block h-full">
          {imgContent}
        </a>
      );
    }

    return <div className="h-full">{imgContent}</div>;
  }

  return null;
}

export default function BannerZone({
  zone,
  className = "",
  fixed = false,
}: {
  zone: string;
  className?: string;
  /** Si es true, muestra un aviso estático (sin marquesina animada) en vez de la cinta desplazable. */
  fixed?: boolean;
}) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanners() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("banners")
        .select("id, zona, imagen_url, url_destino, codigo_html, fecha_inicio, fecha_fin")
        .eq("zona", zone)
        .eq("activo", true);

      if (data) {
        setBanners((data as BannerData[]).filter((b) => estaVigente(b)));
      }
      setLoading(false);
    }
    fetchBanners();
  }, [zone]);

  const medida = useImpresiones(banners.map((b) => b.id));

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
  }

  // Sin avisos activos: mensaje de espacio disponible (estático o en marquesina).
  if (banners.length === 0) {
    const placeholder = "Espacio publicitario disponible · Consultá tarifas";

    if (fixed) {
      return (
        <div className={`flex items-center justify-center overflow-hidden rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 ${className}`}>
          <span className="text-gray-400 text-[10px] leading-tight sm:text-sm sm:leading-normal px-2 sm:px-4 text-center line-clamp-3">{placeholder}</span>
        </div>
      );
    }

    const looped = Array(6).fill(placeholder);
    return (
      <div className={`overflow-hidden rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 ${className}`}>
        <div className="marquee-track h-full items-center py-2">
          {looped.map((text, i) => (
            <span key={i} className="marquee-item h-full flex items-center px-4 sm:px-8 text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              {text}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Fijo: se muestra el primer aviso activo, sin desplazamiento.
  if (fixed) {
    return (
      <div ref={medida} className={`flex items-center justify-center overflow-hidden rounded-lg bg-gray-50 ${className}`}>
        <BannerItem banner={banners[0]} zone={zone} />
      </div>
    );
  }

  // Marquesina: los avisos se desplazan de derecha a izquierda.
  const looped = [...banners, ...banners];

  return (
    <div ref={medida} className={`overflow-hidden rounded-lg bg-gray-50 ${className}`}>
      <div className="marquee-track h-full items-center py-2">
        {looped.map((banner, i) => (
          <div key={`${banner.id}-${i}`} className="marquee-item h-full px-4">
            <BannerItem banner={banner} zone={zone} />
          </div>
        ))}
      </div>
    </div>
  );
}
