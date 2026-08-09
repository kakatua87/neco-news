"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BannerData = {
  id: string;
  zona: string;
  imagen_url: string | null;
  url_destino: string | null;
  codigo_html: string | null;
};

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

    if (banner.url_destino) {
      return (
        <a href={banner.url_destino} target="_blank" rel="noopener noreferrer" className="block h-full">
          {imgContent}
        </a>
      );
    }

    return <div className="h-full">{imgContent}</div>;
  }

  return null;
}

export default function BannerZone({ zone, className = "" }: { zone: string; className?: string }) {
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanners() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("banners")
        .select("id, zona, imagen_url, url_destino, codigo_html")
        .eq("zona", zone)
        .eq("activo", true);

      if (data) {
        setBanners(data as BannerData[]);
      }
      setLoading(false);
    }
    fetchBanners();
  }, [zone]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
  }

  // Sin avisos activos: la marquesina muestra el mensaje de espacio disponible.
  if (banners.length === 0) {
    const placeholder = "Espacio publicitario disponible · Consultá tarifas";
    const looped = Array(6).fill(placeholder);
    return (
      <div className={`overflow-hidden rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 ${className}`}>
        <div className="marquee-track h-full items-center py-2">
          {looped.map((text, i) => (
            <span key={i} className="marquee-item h-full flex items-center px-8 text-gray-400 text-sm whitespace-nowrap">
              {text}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Marquesina: los avisos se desplazan de derecha a izquierda.
  const looped = [...banners, ...banners];

  return (
    <div className={`overflow-hidden rounded-lg bg-gray-50 ${className}`}>
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
