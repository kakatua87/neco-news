"use client";

import { useEffect, useState } from "react";
import BannerSiteMap from "./BannerSiteMap";
import BannerZoneModal from "./BannerZoneModal";
import { ZONAS_FIJAS, zonasPorSecciones, aspectRatio as ratioDe, tamanoLabel } from "./bannerZonas";

type Banner = {
  id: string;
  zona: string;
  nombre: string | null;
  imagen_url: string | null;
  url_destino: string | null;
  codigo_html: string | null;
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
};

type FilaStats = { banner_id: string; dia: string; impresiones: number; clics: number };

const RANGOS = [7, 30, 90];
const num = (n: number) => n.toLocaleString("es-AR");

const ZONA_CUSTOM_DEFAULT = { ancho: 1200, alto: 100 };

export default function BannersPanel({ secciones = [] as string[] }) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [verTodos, setVerTodos] = useState(false);
  const [filas, setFilas] = useState<FilaStats[]>([]);
  const [rango, setRango] = useState(30);

  const [modalOpen, setModalOpen] = useState(false);
  const [zonaActiva, setZonaActiva] = useState("");

  const zonasConocidas = [...ZONAS_FIJAS, ...zonasPorSecciones(secciones)];

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners");
      const data = await res.json();
      if (res.ok) setBanners(data.banners || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/banners/stats?dias=${rango}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelado && d.ok) setFilas(d.filas || []);
      })
      .catch((e) => console.error(e));
    return () => {
      cancelado = true;
    };
  }, [rango]);

  const totalesDe = (id: string) => {
    const propias = filas.filter((f) => f.banner_id === id);
    const impresiones = propias.reduce((a, f) => a + f.impresiones, 0);
    const clics = propias.reduce((a, f) => a + f.clics, 0);
    return { impresiones, clics, ctr: impresiones > 0 ? (clics / impresiones) * 100 : 0 };
  };

  /** Descarga el detalle diario del banner (para mandárselo al anunciante). */
  const descargarReporte = (b: Banner) => {
    const lineas = filas
      .filter((f) => f.banner_id === b.id)
      .map((f) => `${f.dia},${f.impresiones},${f.clics},${f.impresiones > 0 ? ((f.clics / f.impresiones) * 100).toFixed(2) : "0.00"}`);
    const csv = ["fecha,impresiones,clics,ctr_%", ...lineas].join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${(b.nombre || b.zona).replace(/[^\w-]+/g, "_")}-${rango}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const abrirZona = (zona: string) => {
    setZonaActiva(zona);
    setModalOpen(true);
  };

  const zonaInfo = zonasConocidas.find((z) => z.zona === zonaActiva);
  const dims = zonaInfo || ZONA_CUSTOM_DEFAULT;

  const eliminarBanner = async (b: Banner) => {
    if (!confirm(`¿Eliminar el banner "${b.nombre || b.zona}"?`)) return;
    setBanners((prev) => prev.filter((x) => x.id !== b.id));
    const res = await fetch(`/api/banners/${b.id}`, { method: "DELETE" });
    if (!res.ok) fetchBanners();
  };

  const toggleActivo = async (b: Banner) => {
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, activo: !x.activo } : x)));
    const res = await fetch(`/api/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !b.activo }),
    });
    if (!res.ok) fetchBanners();
  };

  return (
    <div className="space-y-6 fade-in max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink mb-1">Banners publicitarios</h2>
          <p className="text-sm text-muted">
            Hacé click en cualquier espacio marcado con &quot;+ Banner&quot; para cargar o editar un aviso ahí.
          </p>
        </div>
        <button
          onClick={() => abrirZona("")}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:underline whitespace-nowrap"
        >
          + Zona personalizada
        </button>
      </div>

      <BannerSiteMap secciones={secciones} banners={banners} onZoneClick={abrirZona} />

      <div className="bg-white rounded-xl border border-border shadow-sm">
        <button
          onClick={() => setVerTodos((v) => !v)}
          className="w-full flex justify-between items-center px-6 py-4 text-sm font-bold text-ink"
        >
          <span>Ver todos los banners cargados ({banners.length})</span>
          <span className={`transition-transform ${verTodos ? "rotate-180" : ""}`}>▾</span>
        </button>
        {verTodos && (
          <div className="px-6 pb-6 space-y-2">
            <div className="flex items-center justify-end gap-1 pb-1">
              <span className="text-xs text-muted mr-1">Estadísticas de los últimos</span>
              {RANGOS.map((d) => (
                <button
                  key={d}
                  onClick={() => setRango(d)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    rango === d ? "bg-ink text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
            {loading ? (
              <p className="text-sm text-muted">Cargando...</p>
            ) : banners.length === 0 ? (
              <p className="text-sm text-muted">Todavía no cargaste ningún banner.</p>
            ) : (
              banners.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <div className="w-16 h-12 rounded bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {b.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.imagen_url} alt="" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-muted px-1 text-center">HTML</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink truncate">{b.nombre || "(sin nombre)"}</p>
                    <p className="text-xs text-muted">
                      <code className="bg-gray-100 px-1 rounded">{b.zona}</code>
                    </p>
                  </div>
                  {(() => {
                    const t = totalesDe(b.id);
                    return (
                      <div className="hidden sm:flex gap-4 text-center shrink-0" title={`Últimos ${rango} días`}>
                        <div>
                          <p className="text-sm font-bold text-ink">{num(t.impresiones)}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted">Impresiones</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{b.codigo_html ? "—" : num(t.clics)}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted">Clics</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{b.codigo_html ? "—" : `${t.ctr.toFixed(2)}%`}</p>
                          <p className="text-[10px] uppercase tracking-wide text-muted">CTR</p>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => descargarReporte(b)}
                    title="Descargar detalle diario (CSV)"
                    className="px-2.5 py-1.5 text-sm font-medium text-ink bg-gray-100 hover:bg-gray-200 rounded transition-colors shrink-0"
                  >
                    ⬇ CSV
                  </button>
                  <button
                    onClick={() => toggleActivo(b)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-full shrink-0 ${
                      b.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {b.activo ? "Activo" : "Pausado"}
                  </button>
                  <button
                    onClick={() => abrirZona(b.zona)}
                    className="px-3 py-1.5 text-sm font-medium text-ink bg-gray-100 hover:bg-gray-200 rounded transition-colors shrink-0"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => eliminarBanner(b)}
                    className="px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                  >
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <BannerZoneModal
        isOpen={modalOpen}
        zona={zonaActiva}
        zonaLabel={zonaInfo?.label || "Zona personalizada"}
        aspectRatio={ratioDe(dims)}
        sizeLabel={tamanoLabel(dims)}
        onClose={() => setModalOpen(false)}
        onChanged={fetchBanners}
      />
    </div>
  );
}
