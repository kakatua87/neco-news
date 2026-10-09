"use client";

import { useMemo, useState } from "react";
import InstagramCardEditor from "../InstagramCardEditor";
import { FORMATOS, type FormatoKey } from "../instagramFormatos";
import { adminFetch } from "../_lib/adminFetch";
import { useToast } from "../_lib/toast";
import { useToggleSet } from "../_lib/useToggleSet";
import { useNoticiaLink } from "../_lib/useNoticiaLink";
import type { InstagramKitItem } from "../_lib/types";
import { agruparPorMesYDia } from "@/lib/fechas";

type Filtro = "todas" | "sin_publicar" | "publicadas";
type Red = "instagram" | "facebook";

/** "8 oct 22:18", en hora de Argentina. */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function RedesTab({ initialItems }: { initialItems: InstagramKitItem[] }) {
  const toast = useToast();
  const noticiaLink = useNoticiaLink();

  const [items, setItems] = useState(initialItems);
  const [busyIds, setBusyIds] = useState<Array<string | number>>([]);
  // Claves "<red>-<id>" o "ambas-<id>" de lo que se está publicando ahora mismo.
  const [publicandoIds, setPublicandoIds] = useState<string[]>([]);
  const [modoFacebook, setModoFacebook] = useState<Record<string | number, "foto" | "enlace">>({});
  const [seleccionadas, toggleSeleccion, setSeleccionadas] = useToggleSet<string | number>();
  const [mesesExpandidos, toggleMes] = useToggleSet<string>();
  const [editando, setEditando] = useState<{ item: InstagramKitItem; formato: FormatoKey } | null>(null);
  // URL de la tarjeta editada a mano, por `${id}-${formato}`.
  const [editadas, setEditadas] = useState<Record<string, string>>({});
  const [formatoElegido, setFormatoElegido] = useState<Record<string | number, FormatoKey>>({});

  const [filtro, setFiltro] = useState<Filtro>("todas");

  const estaPublicada = (n: InstagramKitItem) => !!(n.instagram_publicado_at || n.facebook_publicado_at);
  const conteo = useMemo(() => {
    const publicadas = items.filter((n) => n.instagram_publicado_at || n.facebook_publicado_at).length;
    return { todas: items.length, publicadas, sin_publicar: items.length - publicadas };
  }, [items]);
  const visibles = useMemo(
    () =>
      filtro === "todas"
        ? items
        : items.filter((n) => !!(n.instagram_publicado_at || n.facebook_publicado_at) === (filtro === "publicadas")),
    [items, filtro]
  );
  const agrupadas = useMemo(() => agruparPorMesYDia(visibles), [visibles]);

  const generarImagenIA = async (item: InstagramKitItem) => {
    setBusyIds((prev) => [...prev, item.id]);
    const r = await adminFetch<{ imagen_url: string }>("/api/generar-imagen-ia", {
      method: "POST",
      json: { noticia_id: item.id, titulo: item.titulo, seccion: item.seccion },
    });
    setBusyIds((prev) => prev.filter((x) => x !== item.id));
    if (!r.ok || !r.data) {
      toast(`No se pudo generar la imagen: ${r.error}`);
      return;
    }
    const imagenUrl = r.data.imagen_url;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, imagen_url: imagenUrl } : n)));
  };

  const copiarTodo = (item: InstagramKitItem) => {
    const texto = `${item.instagram_titulo || item.titulo}\n\n${item.instagram_text || ""}\n\n${noticiaLink(item)}`;
    navigator.clipboard.writeText(texto);
  };

  const copiarLink = (item: InstagramKitItem) => {
    navigator.clipboard.writeText(noticiaLink(item));
  };

  const NOMBRE_RED = { instagram: "Instagram", facebook: "Facebook" } as const;

  /** Publica una nota en una red y refleja la marca en pantalla. No muestra avisos: devuelve el resultado. */
  const enviarARed = async (
    red: Red,
    item: InstagramKitItem,
    forzar: boolean
  ): Promise<{ ok: boolean; mensaje: string }> => {
    const formato = formatoElegido[item.id] || "cuadrado";
    const imagenUrlEditada = editadas[`${item.id}-${formato}`];
    const json =
      red === "instagram"
        ? { noticiaId: item.id, formato, destino: formato === "historia" ? "historia" : "feed", imagenUrlEditada, forzar }
        : { noticiaId: item.id, formato, modo: modoFacebook[item.id] || "foto", imagenUrlEditada, forzar };
    const campo = red === "instagram" ? "instagram" : "facebook";

    const r = await adminFetch<{ permalink?: string | null; publicadoAt?: string | null; avisoMarca?: string }>(
      `/api/${campo}/publicar`,
      { method: "POST", json }
    );
    if (r.status === 409) {
      // Otro editor (u otra pestaña) ya la publicó: se refleja la marca sin recargar.
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, [`${campo}_publicado_at`]: n[`${campo}_publicado_at`] || new Date().toISOString() } : n))
      );
      return { ok: false, mensaje: `ya estaba publicada en ${NOMBRE_RED[red]}` };
    }
    if (!r.ok) return { ok: false, mensaje: `no se pudo publicar en ${NOMBRE_RED[red]}: ${r.error}` };
    setItems((prev) =>
      prev.map((n) =>
        n.id === item.id
          ? { ...n, [`${campo}_publicado_at`]: r.data?.publicadoAt || new Date().toISOString(), [`${campo}_permalink`]: r.data?.permalink ?? null }
          : n
      )
    );
    return { ok: true, mensaje: r.data?.avisoMarca || `¡Publicado en ${NOMBRE_RED[red]}!` };
  };

  const publicarEnRed = async (red: Red, item: InstagramKitItem) => {
    const yaPublicada = !!(red === "instagram" ? item.instagram_publicado_at : item.facebook_publicado_at);
    if (yaPublicada && !confirm(`Esta noticia ya se publicó en ${NOMBRE_RED[red]}. ¿Publicarla de nuevo? Va a quedar duplicada.`)) {
      return;
    }
    const clave = `${red}-${item.id}`;
    setPublicandoIds((prev) => [...prev, clave]);
    const r = await enviarARed(red, item, yaPublicada);
    setPublicandoIds((prev) => prev.filter((k) => k !== clave));
    toast(r.ok ? r.mensaje : `${r.mensaje.charAt(0).toUpperCase()}${r.mensaje.slice(1)}`, r.ok ? "ok" : undefined);
  };

  /** Instagram primero y luego Facebook; salta la red donde ya está publicada y no revierte si una falla. */
  const publicarEnAmbas = async (item: InstagramKitItem) => {
    const redes = (["instagram", "facebook"] as Red[]).filter((red) => !(red === "instagram" ? item.instagram_publicado_at : item.facebook_publicado_at));
    if (redes.length === 0) {
      toast("Esta noticia ya está publicada en las dos redes.");
      return;
    }
    const clave = `ambas-${item.id}`;
    setPublicandoIds((prev) => [...prev, clave]);
    const resultados: string[] = [];
    let todoOk = true;
    for (const red of redes) {
      const r = await enviarARed(red, item, false);
      todoOk = todoOk && r.ok;
      resultados.push(r.ok ? `✓ ${NOMBRE_RED[red]}` : `✗ ${r.mensaje}`);
    }
    setPublicandoIds((prev) => prev.filter((k) => k !== clave));
    toast(resultados.join(" · "), todoOk ? "ok" : undefined);
  };

  const seleccionarTodas = () =>
    setSeleccionadas((prev) => (prev.size === visibles.length ? new Set() : new Set(visibles.map((n) => n.id))));

  const quitarSeleccionadas = async () => {
    if (seleccionadas.size === 0) return;
    const n = seleccionadas.size;
    if (!confirm(`¿Quitar ${n} nota${n !== 1 ? "s" : ""} del kit de Instagram? La noticia sigue publicada en el portal, solo se quita de esta lista.`)) return;
    const ids = Array.from(seleccionadas);
    const r = await adminFetch("/api/noticias/instagram-kit/descartar", { method: "POST", json: { ids } });
    if (!r.ok) {
      toast(`No se pudieron quitar las notas: ${r.error}`);
      return;
    }
    setItems((prev) => prev.filter((n) => !seleccionadas.has(n.id)));
    setSeleccionadas(new Set());
  };

  return (
    <>
      <div className="space-y-6 fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink">📣 Redes</h2>
            <p className="text-sm text-muted mt-1">
              Título gancho, imagen y link listos para copiar y postear manualmente con tus hashtags.
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visibles.length > 0 && seleccionadas.size === visibles.length}
                  onChange={seleccionarTodas}
                  className="w-4 h-4 accent-accent"
                />
                Seleccionar todas
              </label>
              <button
                onClick={quitarSeleccionadas}
                disabled={seleccionadas.size === 0}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-40"
              >
                🗑 Quitar seleccionadas ({seleccionadas.size})
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por estado de publicación">
            {(
              [
                ["todas", "Todas"],
                ["sin_publicar", "Sin publicar"],
                ["publicadas", "Ya publicadas"],
              ] as Array<[Filtro, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={filtro === key}
                onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  filtro === key ? "bg-accent text-white border-accent font-bold" : "bg-white text-muted border-border hover:bg-gray-50"
                }`}
              >
                {label} ({conteo[key]})
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {agrupadas.map((mes) => {
            const expandido = mesesExpandidos.has(mes.key);
            const totalMes = mes.dias.reduce((acc, d) => acc + d.items.length, 0);
            return (
              <div key={mes.key} className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleMes(mes.key)}
                  className="w-full flex justify-between items-center px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-ink">{mes.label}</span>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    {totalMes} noticia{totalMes !== 1 ? "s" : ""}
                    <span className={`inline-block transition-transform ${expandido ? "rotate-180" : ""}`}>▾</span>
                  </span>
                </button>

                {expandido && (
                  <div className="p-5 space-y-8">
                    {mes.dias.map((dia) => (
                      <div key={dia.key}>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">{dia.label}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {dia.items.map((item) => {
                            const busy = busyIds.includes(item.id);
                            const selected = seleccionadas.has(item.id);
                            // Mientras se publica en una red (o en ambas) se bloquean los tres botones de esa nota.
                            const ocupada = ["instagram", "facebook", "ambas"].some((p) => publicandoIds.includes(`${p}-${item.id}`));
                            return (
                              <article key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col relative ${selected ? "border-accent ring-2 ring-accent/30" : estaPublicada(item) ? "border-green-300 bg-green-50/40" : "border-border"}`}>
                                <label className="absolute top-3 left-3 z-10 bg-white/90 rounded-md p-1 cursor-pointer shadow-sm">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleSeleccion(item.id)}
                                    className="w-4 h-4 accent-accent"
                                  />
                                </label>
                                <div className="p-3 bg-gray-100 flex-shrink-0">
                                  {item.imagen_url ? (
                                    <div className="grid grid-cols-3 gap-2">
                                      {FORMATOS.map((f) => {
                                        const key = `${item.id}-${f.key}`;
                                        const editadaUrl = editadas[key];
                                        const src = editadaUrl || `/api/instagram-card/${item.id}?formato=${f.key}`;
                                        return (
                                          <div key={f.key} className="flex flex-col gap-1">
                                            <div className="rounded overflow-hidden border border-gray-300" style={{ aspectRatio: `${f.ancho} / ${f.alto}` }}>
                                              <img src={src} alt={f.label} loading="lazy" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-[9px] text-center text-muted">{f.label}</p>
                                            <div className="flex gap-1 justify-center">
                                              <a
                                                href={src}
                                                download={`instagram-${item.id}-${f.key}.jpg`}
                                                className="text-[10px] text-blue-600 hover:underline"
                                              >
                                                ⬇️
                                              </a>
                                              <button
                                                onClick={() => setEditando({ item, formato: f.key })}
                                                className="text-[10px] text-blue-600 hover:underline"
                                              >
                                                ✏️
                                              </button>
                                              {editadaUrl && (
                                                <button
                                                  onClick={() => setEditadas((prev) => { const next = { ...prev }; delete next[key]; return next; })}
                                                  className="text-[10px] text-gray-400 hover:underline"
                                                  title="Volver a la versión automática"
                                                >
                                                  ↺
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="h-48 flex items-center justify-center">
                                      <button
                                        onClick={() => generarImagenIA(item)}
                                        disabled={busy}
                                        className="px-4 py-2 text-sm font-medium text-accent hover:underline disabled:opacity-50"
                                      >
                                        {busy ? "Generando..." : "✨ Generar imagen IA"}
                                      </button>
                                    </div>
                                  )}
                                  {item.imagen_url && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <select
                                        value={formatoElegido[item.id] || "cuadrado"}
                                        onChange={(e) => setFormatoElegido((prev) => ({ ...prev, [item.id]: e.target.value as FormatoKey }))}
                                        className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-accent bg-white"
                                      >
                                        {FORMATOS.map((f) => (
                                          <option key={f.key} value={f.key}>
                                            {f.key === "historia" ? "Historia" : `Feed — ${f.label}`}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => publicarEnRed("instagram", item)}
                                        disabled={ocupada}
                                        className="px-3 py-1.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 w-28 text-center"
                                      >
                                        {publicandoIds.includes(`instagram-${item.id}`) ? "Publicando..." : item.instagram_publicado_at ? "↻ Instagram" : "📸 Instagram"}
                                      </button>
                                    </div>
                                  )}
                                  {item.imagen_url && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <select
                                        value={modoFacebook[item.id] || "foto"}
                                        onChange={(e) => setModoFacebook((prev) => ({ ...prev, [item.id]: e.target.value as "foto" | "enlace" }))}
                                        className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-accent bg-white"
                                        aria-label="Formato de la publicación en Facebook"
                                      >
                                        <option value="foto">Facebook — Foto con la tarjeta</option>
                                        <option value="enlace">Facebook — Enlace a la nota</option>
                                      </select>
                                      <button
                                        onClick={() => publicarEnRed("facebook", item)}
                                        disabled={ocupada}
                                        className="px-3 py-1.5 text-xs font-bold bg-[#1877F2] text-white rounded hover:bg-[#1464cc] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 w-28 text-center"
                                      >
                                        {publicandoIds.includes(`facebook-${item.id}`) ? "Publicando..." : item.facebook_publicado_at ? "↻ Facebook" : "📘 Facebook"}
                                      </button>
                                    </div>
                                  )}
                                  {item.imagen_url && (
                                    <button
                                      onClick={() => publicarEnAmbas(item)}
                                      disabled={ocupada}
                                      className="mt-2 w-full px-3 py-1.5 text-xs font-bold border border-accent text-accent rounded hover:bg-accent/10 transition-colors disabled:opacity-50"
                                    >
                                      {publicandoIds.includes(`ambas-${item.id}`) ? "Publicando en las dos..." : "🚀 Publicar en ambas"}
                                    </button>
                                  )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded w-fit">
                                      {item.seccion}
                                    </span>
                                    {item.instagram_publicado_at && (
                                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded">
                                        ✓ Instagram · {fechaCorta(item.instagram_publicado_at)}
                                        {item.instagram_permalink && (
                                          <>
                                            {" "}
                                            <a href={item.instagram_permalink} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                              ver
                                            </a>
                                          </>
                                        )}
                                      </span>
                                    )}
                                    {item.facebook_publicado_at && (
                                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                                        ✓ Facebook · {fechaCorta(item.facebook_publicado_at)}
                                        {item.facebook_permalink && (
                                          <>
                                            {" "}
                                            <a href={item.facebook_permalink} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                                              ver
                                            </a>
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {item.instagram_titulo ? (
                                    <h3 className="font-editorial text-lg font-bold text-ink leading-tight">{item.instagram_titulo}</h3>
                                  ) : (
                                    <p className="text-sm text-muted italic">Generando copy con IA…</p>
                                  )}

                                  {item.instagram_text && (
                                    <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{item.instagram_text}</p>
                                  )}

                                  <a
                                    href={noticiaLink(item)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline break-all"
                                  >
                                    {noticiaLink(item)}
                                  </a>

                                  <div className="mt-auto pt-3 border-t border-border/50 flex flex-wrap gap-2 justify-between">
                                    <button
                                      onClick={() => copiarTodo(item)}
                                      disabled={!item.instagram_titulo && !item.instagram_text}
                                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-ink rounded hover:bg-gray-200 transition-colors disabled:opacity-40"
                                    >
                                      📋 Copiar caption
                                    </button>
                                    <button
                                      onClick={() => copiarLink(item)}
                                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-ink rounded hover:bg-gray-200 transition-colors"
                                    >
                                      🔗 Copiar link
                                    </button>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-12 text-muted">No hay noticias publicadas para mostrar.</div>
          )}
          {items.length > 0 && visibles.length === 0 && (
            <div className="text-center py-12 text-muted">No hay noticias en este filtro.</div>
          )}
        </div>
      </div>

      {editando && (
        <InstagramCardEditor
          isOpen={!!editando}
          formato={editando.formato}
          seccion={editando.item.seccion}
          imagenUrl={editando.item.imagen_url || ""}
          tituloInicial={editando.item.instagram_titulo || editando.item.titulo}
          onClose={() => setEditando(null)}
          onApply={(url) => {
            setEditadas((prev) => ({ ...prev, [`${editando.item.id}-${editando.formato}`]: url }));
            setEditando(null);
          }}
        />
      )}
    </>
  );
}
