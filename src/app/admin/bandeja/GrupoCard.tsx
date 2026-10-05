"use client";

import type { Noticia } from "@/types/noticia";
import type { SugerenciaFusion } from "./agrupar";

/** Estado interactivo de cada grupo de la bandeja. */
export type GrupoEditState = {
  seleccionadas: Set<string | number>; // IDs de fuentes seleccionadas
  imagenId: string | number | null; // ID de la nota cuya imagen se usará
  seccion: string;
};

export type AiProvider = {
  provider: string;
  model: string;
  label: string;
  gratis: boolean;
  default: boolean;
};

type Props = {
  grupoId: string;
  notas: Noticia[];
  estado: GrupoEditState;
  secciones: string[];
  sugerencia?: SugerenciaFusion;
  procesando: boolean;
  aiProviders: AiProvider[];
  menuProveedorAbierto: boolean;
  onToggleFuente: (notaId: string | number) => void;
  onElegirImagen: (notaId: string | number) => void;
  onCambiarSeccion: (seccion: string) => void;
  onFusionar: (grupoIdOrigen: string) => void;
  onDescartar: () => void;
  onProcesar: (provider?: string) => void;
  onToggleMenuProveedor: () => void;
};

export default function GrupoCard({
  grupoId,
  notas,
  estado: gs,
  secciones,
  sugerencia,
  procesando,
  aiProviders,
  menuProveedorAbierto,
  onToggleFuente,
  onElegirImagen,
  onCambiarSeccion,
  onFusionar,
  onDescartar,
  onProcesar,
  onToggleMenuProveedor,
}: Props) {
  const imagenActiva = notas.find((n) => n.id === gs.imagenId);
  const hayVariosProveedores = aiProviders.length > 1;

  return (
    <div key={grupoId} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* ── Header del grupo ── */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
              {notas.length} fuente{notas.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-muted">
              {new Date(notas[0].created_at).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
            </span>
          </div>
          <h3 className="text-lg font-bold text-ink leading-tight">{notas[0].titulo_original || notas[0].titulo}</h3>
          {sugerencia && (
            <button
              onClick={() => onFusionar(sugerencia.grupoId)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full transition-colors"
              title="Un grupo de otro sitio con un título parecido y fecha cercana — probablemente la misma historia"
            >
              ⚠ Posible duplicado en {sugerencia.fuente} · Fusionar
            </button>
          )}
        </div>

        {/* Sección selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted">Sección:</span>
          <select
            value={gs.seccion}
            onChange={(e) => onCambiarSeccion(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 outline-none focus:border-accent bg-white font-medium"
          >
            {secciones.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Fuentes (cada nota del grupo) ── */}
      <div className="p-6">
        <p className="text-xs text-muted font-bold uppercase tracking-wider mb-3">
          Fuentes disponibles (hacé click para seleccionar/deseleccionar)
        </p>
        <div className="space-y-3">
          {notas.map((nota) => {
            const isSelected = gs.seleccionadas.has(nota.id);
            const isImageActive = gs.imagenId === nota.id;
            const hasMultipleImages = notas.length > 1 && notas.filter((n) => n.imagen_url).length > 1;
            return (
              <div key={nota.id} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-white transition-colors">
                {/* Checkbox de selección */}
                <button
                  onClick={() => onToggleFuente(nota.id)}
                  title={isSelected ? "Deseleccionar" : "Seleccionar"}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-colors ${
                    isSelected ? "bg-accent border-accent text-white" : "border-gray-300 bg-white"
                  }`}
                >
                  {isSelected && <span className="text-[10px] font-bold">✓</span>}
                </button>

                {/* Imagen de la nota + selector (solo si hay más de una imagen para elegir) */}
                <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative group">
                  {nota.imagen_url ? (
                    hasMultipleImages ? (
                      <>
                        <img src={nota.imagen_url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onElegirImagen(nota.id);
                          }}
                          className={`absolute inset-0 flex items-center justify-center transition-all ${
                            isImageActive ? "ring-2 ring-accent ring-inset" : "bg-black/0 group-hover:bg-black/30"
                          }`}
                          title={isImageActive ? "Imagen seleccionada para la nota" : "Usar esta imagen"}
                        >
                          <span className={`text-lg ${isImageActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} text-white drop-shadow-lg`}>
                            {isImageActive ? "✓" : "🖼"}
                          </span>
                        </button>
                      </>
                    ) : (
                      <img src={nota.imagen_url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sin foto</div>
                  )}
                </div>

                {/* Info de la nota */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                      {nota.fuente || "Fuente"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-ink leading-snug line-clamp-2">{nota.titulo_original || nota.titulo}</h4>
                  <p className="text-xs text-muted mt-1 line-clamp-2">{nota.cuerpo?.substring(0, 150)}...</p>
                  {nota.url_original && (
                    <a href={nota.url_original} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">
                      Ver artículo original →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Imagen Preview + Acciones ── */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-end justify-between border-t border-border pt-5">
          <div className="flex items-center gap-3">
            {imagenActiva?.imagen_url ? (
              <div className="flex items-center gap-3">
                <img src={imagenActiva.imagen_url} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-green-400" />
                <span className="text-xs text-muted">
                  Imagen de <strong>{imagenActiva.fuente}</strong>
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted italic">Sin imagen seleccionada</span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDescartar}
              disabled={procesando}
              className="px-5 py-2.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              ✕ Descartar grupo
            </button>
            <div className="relative">
              <button
                onClick={() => (hayVariosProveedores ? onToggleMenuProveedor() : onProcesar())}
                disabled={procesando || gs.seleccionadas.size === 0}
                title={gs.seleccionadas.size === 0 ? "Seleccioná al menos una fuente" : undefined}
                className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent flex items-center gap-2"
              >
                {procesando ? (
                  <>
                    <span className="animate-spin">⏳</span> Procesando...
                  </>
                ) : (
                  <>⚡ Procesar con IA{hayVariosProveedores ? " ▾" : ""}</>
                )}
              </button>

              {menuProveedorAbierto && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-lg border border-border shadow-lg overflow-hidden z-10">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted bg-gray-50 border-b border-border">
                    Elegí con qué IA procesar
                  </p>
                  {aiProviders.map((p) => (
                    <button
                      key={p.provider}
                      onClick={() => onProcesar(p.provider)}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-2"
                    >
                      <span>
                        {p.label}
                        {p.default && <span className="text-[10px] text-muted ml-1">(default)</span>}
                      </span>
                      {p.gratis && <span className="text-[10px] font-bold text-[#1da64f]">GRATIS</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
