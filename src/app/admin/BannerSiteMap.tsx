"use client";

import { useState } from "react";
import { zonaSeccion } from "./bannerZonas";

type Banner = { zona: string; activo: boolean };

type Props = {
  secciones: string[];
  banners: Banner[];
  onZoneClick: (zona: string) => void;
};

function Hotspot({
  zona,
  label,
  banners,
  onZoneClick,
  className = "",
}: {
  zona: string;
  label: string;
  banners: Banner[];
  onZoneClick: (zona: string) => void;
  className?: string;
}) {
  const enZona = banners.filter((b) => b.zona === zona);
  const activos = enZona.filter((b) => b.activo).length;
  return (
    <button
      type="button"
      onClick={() => onZoneClick(zona)}
      title={label}
      className={`relative flex items-center justify-center bg-accent/10 hover:bg-accent/20 border-2 border-dashed border-accent/50 rounded text-[10px] font-bold uppercase tracking-wider text-accent transition-colors ${className}`}
    >
      + Banner
      {enZona.length > 0 && (
        <span
          className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
            activos > 0 ? "bg-green-500" : "bg-gray-400"
          }`}
        />
      )}
    </button>
  );
}

export default function BannerSiteMap({ secciones, banners, onZoneClick }: Props) {
  const [seccionActiva, setSeccionActiva] = useState(secciones[0] || "Local");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* HOME */}
      <div className="border border-border rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Página principal</p>
        <div className="flex gap-2 mb-2">
          <div className="flex-[3] flex flex-col gap-1.5">
            <div className="h-16 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
              Carrusel de portada
            </div>
            <Hotspot zona="portada" label="Debajo del carrusel principal" banners={banners} onZoneClick={onZoneClick} className="h-8" />
          </div>
          <div className="flex-[2] flex flex-col gap-1.5">
            <Hotspot zona="sidebar" label="Junto al carrusel, sobre Top Stories" banners={banners} onZoneClick={onZoneClick} className="h-8" />
            <div className="flex-1 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
              Top Stories
            </div>
          </div>
        </div>
        <Hotspot zona="header" label="Debajo de portada + Top Stories" banners={banners} onZoneClick={onZoneClick} className="w-full h-8 mb-2" />
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* ARTÍCULO */}
      <div className="border border-border rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nota (artículo)</p>
        <div className="h-24 bg-gray-200 rounded mb-2" />
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-2 bg-gray-200 rounded w-full mb-1" />
        <div className="h-2 bg-gray-200 rounded w-full mb-1" />
        <div className="h-2 bg-gray-200 rounded w-2/3 mb-3" />
        <Hotspot zona="in-article" label="Después del primer párrafo" banners={banners} onZoneClick={onZoneClick} className="w-full h-8 mb-3" />
        <div className="h-2 bg-gray-200 rounded w-full mb-1" />
        <div className="h-2 bg-gray-200 rounded w-full mb-1" />
        <div className="h-2 bg-gray-200 rounded w-5/6" />
      </div>

      {/* LISTADO DE SECCIÓN */}
      <div className="border border-border rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Listado de sección</p>
        {secciones.length > 0 && (
          <select
            value={seccionActiva}
            onChange={(e) => setSeccionActiva(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 mb-2 outline-none focus:border-accent bg-white"
          >
            {secciones.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
        <Hotspot
          zona={zonaSeccion(seccionActiva)}
          label={`Arriba del listado de "${seccionActiva}"`}
          banners={banners}
          onZoneClick={onZoneClick}
          className="w-full h-8 mb-2"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
