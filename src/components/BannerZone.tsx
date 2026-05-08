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

export default function BannerZone({ zone, className = "" }: { zone: string; className?: string }) {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanner() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("banners")
        .select("id, zona, imagen_url, url_destino, codigo_html")
        .eq("zona", zone)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setBanner(data as BannerData);
      }
      setLoading(false);
    }
    fetchBanner();
  }, [zone]);

  if (loading) {
    return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
  }

  if (!banner) {
    return (
      <div className={`bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm p-4 text-center ${className}`}>
        Espacio publicitario disponible · Consultá tarifas
      </div>
    );
  }

  // 1. Prioridad: HTML (AdSense o scripts personalizados)
  if (banner.codigo_html) {
    return (
      <div 
        className={className} 
        dangerouslySetInnerHTML={{ __html: banner.codigo_html }} 
      />
    );
  }

  // 2. Imagen con o sin link
  if (banner.imagen_url) {
    const imgContent = (
      <img 
        src={banner.imagen_url} 
        alt={`Banner ${zone}`} 
        className="w-full h-full object-cover rounded-lg" 
      />
    );

    if (banner.url_destino) {
      return (
        <a href={banner.url_destino} target="_blank" rel="noopener noreferrer" className={`block ${className}`}>
          {imgContent}
        </a>
      );
    }
    
    return <div className={className}>{imgContent}</div>;
  }

  return null;
}
