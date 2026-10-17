import type { FotoFuente } from "@/types/noticia";

type Props = {
  fotos: FotoFuente[] | null | undefined;
  /** Foto que tiene la nota ahora (para marcar cuál está en uso). */
  actual: string | null;
  onElegir: (url: string) => void;
  disabled?: boolean;
};

/**
 * Cuando una nota se armó con más de una fuente, muestra la foto de cada una para elegir con cuál
 * sale. Son copias propias en Storage (las sube el scraper al procesar la nota), así que elegir una
 * es solo cambiar `imagen_url`. Solo panel admin: `imagenes_fuentes` no es una columna pública.
 */
export default function SelectorFotoFuente({ fotos, actual, onElegir, disabled }: Props) {
  if (!fotos || fotos.length < 2) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-gray-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        Foto de cada fuente · elegí con cuál sale
      </p>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
        {fotos.map((f, i) => {
          const enUso = f.url === actual;
          return (
            <div key={`${f.url}-${i}`} className="w-36 flex-shrink-0">
              <button
                type="button"
                onClick={() => onElegir(f.url)}
                disabled={disabled || enUso}
                aria-pressed={enUso}
                title={enUso ? "Es la foto actual" : `Usar la foto de ${f.fuente || "esta fuente"}`}
                className={`relative block w-full overflow-hidden rounded-md border-2 transition disabled:cursor-default ${
                  enUso ? "border-accent" : "border-transparent hover:border-accent/60"
                }`}
              >
                <img
                  src={f.url}
                  alt={`Foto de ${f.fuente || "la fuente"}`}
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
                {enUso && (
                  <span className="absolute left-1 top-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                    ✓ En uso
                  </span>
                )}
                {f.con_logo && (
                  <span
                    className="absolute bottom-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    title="Las fotos de este medio suelen traer su logo"
                  >
                    ⚠ logo del medio
                  </span>
                )}
              </button>
              <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
                <span className="truncate font-medium text-ink">{f.fuente || "Fuente"}</span>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-blue-600 hover:underline"
                >
                  ver
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
