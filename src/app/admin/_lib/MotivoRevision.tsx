/**
 * Veredicto de la edición matutina automática sobre una nota pendiente (solo panel admin).
 * El scraper lo escribe en `noticias.auto_motivo` con la forma:
 *   "pendiente de revision | hechos: <resultado> | imagen: <resultado> [| APROBADA (modo sombra...)]"
 *
 * - Cartel rojo: la nota NO se publicó sola; lista los tramos que fallaron, con el texto exacto.
 * - Cartel verde: en modo sombra la nota pasó todos los controles y se habría publicado sola.
 * No forma parte de la nota ni viaja al público.
 */
const PREFIJO = "pendiente de revision";
const TRAMOS_OK = new Set([
  "hechos: verificados",
  "imagen: limpia",
  "imagen: reemplazada por alternativa limpia",
]);

function tramos(autoMotivo: string | null | undefined): string[] {
  if (!autoMotivo || !autoMotivo.startsWith(PREFIJO)) return [];
  return autoMotivo
    .split(" | ")
    .slice(1)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function motivosDeRevision(autoMotivo: string | null | undefined): string[] {
  return tramos(autoMotivo).filter(
    (t) => !TRAMOS_OK.has(t) && !t.startsWith("APROBADA") && !t.startsWith("aviso:"),
  );
}

/** Avisos que no bloquean (p. ej. cifras que la redacción derivó y no están literales en la fuente). */
export function avisosDeRevision(autoMotivo: string | null | undefined): string[] {
  return tramos(autoMotivo)
    .filter((t) => t.startsWith("aviso:"))
    .map((t) => t.replace(/^aviso:\s*/, ""));
}

export function aprobadaEnSombra(autoMotivo: string | null | undefined): boolean {
  return tramos(autoMotivo).some((t) => t.startsWith("APROBADA"));
}

export default function MotivoRevision({ autoMotivo }: { autoMotivo?: string | null }) {
  const avisos = avisosDeRevision(autoMotivo);
  const cartelAvisos =
    avisos.length > 0 ? (
      <div className="mt-2 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
        <span className="font-bold">Aviso (no bloquea): </span>
        {avisos.join(" · ")}
      </div>
    ) : null;

  if (aprobadaEnSombra(autoMotivo)) {
    return (
      <>
        <div
          role="status"
          className="mt-3 rounded-lg border-2 border-green-600 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          <p className="font-bold uppercase tracking-wide text-xs text-green-700">
            ✓ Pasó todos los controles: en modo automático se habría publicado sola
          </p>
        </div>
        {cartelAvisos}
      </>
    );
  }

  const motivos = motivosDeRevision(autoMotivo);
  if (motivos.length === 0) return cartelAvisos;

  return (
    <>
      <div
        role="alert"
        className="mt-3 rounded-lg border-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        <p className="font-bold uppercase tracking-wide text-xs text-red-700">
          ⚠ No se publicó sola: revisar antes de publicar
        </p>
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {motivos.map((m, i) => (
            <li key={i} className="break-words">
              {m}
            </li>
          ))}
        </ul>
      </div>
      {cartelAvisos}
    </>
  );
}
