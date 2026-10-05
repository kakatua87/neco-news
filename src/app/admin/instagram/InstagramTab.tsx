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

export default function InstagramTab({ initialItems }: { initialItems: InstagramKitItem[] }) {
  const toast = useToast();
  const noticiaLink = useNoticiaLink();

  const [items, setItems] = useState(initialItems);
  const [busyIds, setBusyIds] = useState<Array<string | number>>([]);
  const [publicandoIds, setPublicandoIds] = useState<Array<string | number>>([]);
  const [seleccionadas, toggleSeleccion, setSeleccionadas] = useToggleSet<string | number>();
  const [mesesExpandidos, toggleMes] = useToggleSet<string>();
  const [editando, setEditando] = useState<{ item: InstagramKitItem; formato: FormatoKey } | null>(null);
  // URL de la tarjeta editada a mano, por `${id}-${formato}`.
  const [editadas, setEditadas] = useState<Record<string, string>>({});
  const [formatoElegido, setFormatoElegido] = useState<Record<string | number, FormatoKey>>({});

  const agrupadas = useMemo(() => agruparPorMesYDia(items), [items]);

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

  // X (Twitter) sí tiene un web-intent público: abre una ventana de
  // compose con el texto y el link precargados.
  const compartirEnX = (item: InstagramKitItem) => {
    const texto = item.instagram_titulo || item.titulo;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(noticiaLink(item))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Instagram no tiene un web-intent público para compartir contenido
  // externo. En mobile, navigator.share() abre la bandeja nativa del
  // sistema (que incluye Instagram como destino); en desktop no existe,
  // así que caemos al copy-to-clipboard de siempre.
  const compartirEnInstagram = async (item: InstagramKitItem) => {
    const texto = `${item.instagram_titulo || item.titulo}\n\n${item.instagram_text || ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.instagram_titulo || item.titulo, text: texto, url: noticiaLink(item) });
        return;
      } catch {
        // el usuario canceló el share sheet, o el navegador no pudo abrirlo — caemos al copy
      }
    }
    copiarTodo(item);
    toast("Copiado. Pegalo en Instagram (no tiene un botón de compartir directo desde la web).", "ok");
  };

  const publicarEnInstagram = async (item: InstagramKitItem) => {
    const formato = formatoElegido[item.id] || "cuadrado";
    const destino = formato === "historia" ? "historia" : "feed";
    const imagenUrlEditada = editadas[`${item.id}-${formato}`];
    setPublicandoIds((prev) => [...prev, item.id]);
    const r = await adminFetch("/api/instagram/publicar", {
      method: "POST",
      json: { noticiaId: item.id, formato, destino, imagenUrlEditada },
    });
    setPublicandoIds((prev) => prev.filter((id) => id !== item.id));
    if (r.ok) toast("¡Publicado en Instagram!", "ok");
    else toast(`No se pudo publicar: ${r.error}`);
  };

  const seleccionarTodas = () =>
    setSeleccionadas((prev) => (prev.size === items.length ? new Set() : new Set(items.map((n) => n.id))));

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
            <h2 className="text-2xl font-bold text-ink">📸 Kit de Instagram</h2>
            <p className="text-sm text-muted mt-1">
              Título gancho, imagen y link listos para copiar y postear manualmente con tus hashtags.
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={items.length > 0 && seleccionadas.size === items.length}
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
                            return (
                              <article key={item.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col relative ${selected ? "border-accent ring-2 ring-accent/30" : "border-border"}`}>
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
                                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-accent bg-white"
                                      >
                                        {FORMATOS.map((f) => (
                                          <option key={f.key} value={f.key}>
                                            {f.key === "historia" ? "Historia" : `Feed — ${f.label}`}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => publicarEnInstagram(item)}
                                        disabled={publicandoIds.includes(item.id)}
                                        className="px-3 py-1.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-50 whitespace-nowrap"
                                      >
                                        {publicandoIds.includes(item.id) ? "Publicando..." : "📸 Publicar"}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col gap-3">
                                  <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-1 rounded w-fit">
                                    {item.seccion}
                                  </span>

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
                                    <button
                                      onClick={() => compartirEnX(item)}
                                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-ink rounded hover:bg-gray-200 transition-colors"
                                    >
                                      𝕏 Compartir en X
                                    </button>
                                    <button
                                      onClick={() => compartirEnInstagram(item)}
                                      disabled={!item.instagram_titulo && !item.instagram_text}
                                      className="px-3 py-1.5 text-xs font-bold bg-accent text-white rounded hover:bg-accent-dark transition-colors disabled:opacity-40"
                                    >
                                      📸 Compartir en Instagram
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
