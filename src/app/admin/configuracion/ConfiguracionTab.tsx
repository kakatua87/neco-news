"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useScraperConfig } from "../_lib/useScraperConfig";
import { FUENTES_SCRAPER, type ScraperConfig } from "../_lib/scraperConfig";
import type { AiProvider } from "../bandeja/GrupoCard";

type Props = {
  scraperConfig: ScraperConfig;
  seccionesUsadas: string[];
  seccionesDisponibles: string[];
};

export default function ConfiguracionTab({ scraperConfig, seccionesUsadas: usadasIniciales, seccionesDisponibles }: Props) {
  const router = useRouter();
  const toast = useToast();
  const { config, toggleFuente, agregarFuenteCustom, eliminarFuenteCustom } = useScraperConfig(scraperConfig);

  // Proveedores de IA realmente disponibles en el servidor de scraping (null = cargando).
  const [aiProviders, setAiProviders] = useState<AiProvider[] | null>(null);
  useEffect(() => {
    adminFetch<{ providers?: AiProvider[] }>("/api/ai-providers").then((r) => setAiProviders(r.data?.providers ?? []));
  }, []);

  // ─── Secciones: renombrar ──────────────────────────────────────
  const [seccionesUsadas, setSeccionesUsadas] = useState(usadasIniciales);
  const [seccionesAbierta, setSeccionesAbierta] = useState(false);
  const [editandoSeccion, setEditandoSeccion] = useState<string | null>(null);
  const [nombreSeccionInput, setNombreSeccionInput] = useState("");
  const [renombrandoSeccion, setRenombrandoSeccion] = useState(false);

  const renombrarSeccion = async (anterior: string) => {
    const nueva = nombreSeccionInput.trim();
    if (!nueva || nueva === anterior) {
      setEditandoSeccion(null);
      return;
    }
    if (seccionesDisponibles.includes(nueva) || seccionesUsadas.includes(nueva)) {
      toast(`Ya existe una sección llamada "${nueva}". Elegí otro nombre o renombrá esa en su lugar.`);
      return;
    }
    setRenombrandoSeccion(true);
    const r = await adminFetch("/api/secciones/renombrar", { method: "POST", json: { anterior, nueva } });
    setRenombrandoSeccion(false);
    if (!r.ok) {
      toast(`No se pudo renombrar la sección: ${r.error}`);
      return;
    }
    setSeccionesUsadas((prev) => prev.map((s) => (s === anterior ? nueva : s)));
    setEditandoSeccion(null);
    router.refresh();
  };

  // ─── Fuentes de noticias ───────────────────────────────────────
  const [editandoFuentes, setEditandoFuentes] = useState(false);
  const [nuevaFuenteNombre, setNuevaFuenteNombre] = useState("");
  const [nuevaFuenteUrl, setNuevaFuenteUrl] = useState("");
  const [nuevaFuenteError, setNuevaFuenteError] = useState<string | null>(null);

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <h2 className="text-2xl font-bold text-ink mb-6">Configuración del Pipeline</h2>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-3">
        <h3 className="font-bold text-ink">Instagram</h3>
        <p className="text-sm text-muted">
          Conectá tu cuenta de Instagram (Business/Creator) para poder publicar directo desde
          el tab Instagram. El token dura ~60 días, hay que repetir este paso cuando venza.
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ruta API que redirige a Instagram, no una página de Next */}
        <a
          href="/api/instagram/conectar"
          className="inline-block px-5 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
        >
          🔗 Conectar/renovar Instagram
        </a>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => setSeccionesAbierta((v) => !v)}
          className="w-full flex justify-between items-center px-6 py-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div>
            <h3 className="font-bold text-ink">Secciones</h3>
            <p className="text-sm text-muted mt-1">
              {seccionesUsadas.length} sección{seccionesUsadas.length !== 1 ? "es" : ""} en uso — click para {seccionesAbierta ? "ocultar" : "ver y renombrar"}
            </p>
          </div>
          <span className={`inline-block text-muted transition-transform ${seccionesAbierta ? "rotate-180" : ""}`}>▾</span>
        </button>

        {seccionesAbierta && (
          <div className="px-6 pb-6 space-y-3 border-t border-border pt-4">
            <p className="text-sm text-muted">
              Renombrar una sección actualiza todas las noticias que la usan. Los links de esa sección
              cambian de URL, así que las notas ya publicadas y compartidas con el nombre anterior
              dejarán de resolver en esa dirección.
            </p>
            {seccionesUsadas.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay noticias con una sección asignada.</p>
            ) : (
              <div className="space-y-2">
                {seccionesUsadas.map((sec) => (
                  <div key={sec} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg bg-gray-50">
                    {editandoSeccion === sec ? (
                      <>
                        <input
                          value={nombreSeccionInput}
                          onChange={(e) => setNombreSeccionInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renombrarSeccion(sec);
                            if (e.key === "Escape") setEditandoSeccion(null);
                          }}
                          autoFocus
                          maxLength={50}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => renombrarSeccion(sec)}
                            disabled={renombrandoSeccion}
                            className="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-sm rounded-lg font-medium disabled:opacity-50"
                          >
                            {renombrandoSeccion ? "Guardando..." : "Guardar"}
                          </button>
                          <button
                            onClick={() => setEditandoSeccion(null)}
                            disabled={renombrandoSeccion}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-ink rounded-lg font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-ink">{sec}</span>
                        <button
                          onClick={() => {
                            setEditandoSeccion(sec);
                            setNombreSeccionInput(sec);
                          }}
                          className="text-sm text-blue-600 hover:underline font-medium shrink-0"
                        >
                          ✏️ Renombrar
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-ink mb-2">Motor de Inteligencia Artificial</h3>
          <p className="text-sm text-muted mb-4">
            El sistema utiliza arquitectura multi-proveedor. Actualmente configurado mediante variables de entorno en el servidor de scraping.
          </p>
          <div className="space-y-3">
            {aiProviders === null ? (
              <p className="text-sm text-muted">Consultando proveedores…</p>
            ) : aiProviders.length === 0 ? (
              <p className="text-sm text-muted">No se pudo consultar el servidor de scraping.</p>
            ) : (
              aiProviders.map((p) => (
                <div key={p.provider} className="flex justify-between items-center p-3 border border-border rounded-lg bg-gray-50">
                  <span className="font-medium">{p.label}</span>
                  <span className="flex gap-2">
                    {p.default && <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded">Por defecto</span>}
                    {p.gratis && <span className="bg-[#25D366]/20 text-[#1da64f] text-xs font-bold px-2 py-1 rounded">Gratis</span>}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <hr className="border-border" />

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-ink">Fuentes de Noticias</h3>
            <button
              onClick={() => {
                setEditandoFuentes((v) => !v);
                setNuevaFuenteError(null);
              }}
              className="text-sm text-blue-600 hover:underline font-medium shrink-0"
            >
              {editandoFuentes ? "Listo" : "✏️ Editar listado"}
            </button>
          </div>
          <p className="text-sm text-muted mb-3">
            Destildá una fuente para que el scraper deje de revisarla.
            {editandoFuentes && " En modo edición podés quitar sitios agregados a mano o sumar uno nuevo pegando su dirección web."}
          </p>

          <div className="space-y-2">
            {FUENTES_SCRAPER.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={config.fuentes_activas.includes(f.key)}
                    onChange={() => toggleFuente(f.key)}
                    className="w-4 h-4 accent-accent"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-xs text-muted">{f.domain}</span>
                  </div>
                </div>
                {editandoFuentes && <span className="text-[10px] text-muted italic shrink-0">predefinida</span>}
              </label>
            ))}

            {config.fuentes_custom.map((f) => {
              let dominio = f.url;
              try { dominio = new URL(f.url).hostname; } catch {}
              return (
                <div key={f.key} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg hover:bg-gray-50">
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={config.fuentes_activas.includes(f.key)}
                      onChange={() => toggleFuente(f.key)}
                      className="w-4 h-4 accent-accent"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-xs text-muted">{dominio}</span>
                    </div>
                  </label>
                  {editandoFuentes && (
                    <button
                      onClick={() => eliminarFuenteCustom(f.key)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                    >
                      🗑 Quitar
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {editandoFuentes && (
            <div className="mt-4 p-4 border border-dashed border-border rounded-lg bg-gray-50 space-y-3">
              <div>
                <p className="text-sm font-bold text-ink">➕ Agregar sitio</p>
                <p className="text-xs text-muted mt-1">
                  Pegá la dirección de la portada del sitio, con este formato:{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-border">https://www.nombredelsitio.com.ar</code>
                  {" "}(sin nada después del dominio). Funciona mejor con sitios de noticias tipo WordPress —
                  puede necesitar un ajuste manual si el sitio tiene un diseño muy particular.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={nuevaFuenteNombre}
                  onChange={(e) => setNuevaFuenteNombre(e.target.value)}
                  placeholder="Nombre (ej: Diario XYZ)"
                  maxLength={60}
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  value={nuevaFuenteUrl}
                  onChange={(e) => setNuevaFuenteUrl(e.target.value)}
                  placeholder="https://www.ejemplo.com.ar"
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={() => {
                    const r = agregarFuenteCustom(nuevaFuenteNombre, nuevaFuenteUrl);
                    if (!r.ok) {
                      setNuevaFuenteError(r.error || "No se pudo agregar la fuente.");
                      return;
                    }
                    setNuevaFuenteNombre("");
                    setNuevaFuenteUrl("");
                    setNuevaFuenteError(null);
                  }}
                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm rounded-lg font-medium shrink-0"
                >
                  Agregar
                </button>
              </div>
              {nuevaFuenteError && <p className="text-xs text-red-600">{nuevaFuenteError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
