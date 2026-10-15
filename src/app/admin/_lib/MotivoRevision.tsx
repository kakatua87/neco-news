/**
 * Cartel rojo con el motivo exacto por el que la edición matutina automática NO publicó una nota.
 * El motivo lo escribe el scraper en `noticias.auto_motivo` con la forma:
 *   "pendiente de revision | hechos: <resultado> | imagen: <resultado>"
 * Solo se muestran los tramos que fallaron; "verificados" / "limpia" son resultados correctos.
 * Es solo para el panel admin: no forma parte de la nota ni viaja al público.
 */
const PREFIJO = "pendiente de revision";
const TRAMOS_OK = new Set([
  "hechos: verificados",
  "imagen: limpia",
  "imagen: reemplazada por alternativa limpia",
]);

export function motivosDeRevision(autoMotivo: string | null | undefined): string[] {
  if (!autoMotivo || !autoMotivo.startsWith(PREFIJO)) return [];
  return autoMotivo
    .split(" | ")
    .slice(1)
    .map((t) => t.trim())
    .filter((t) => t && !TRAMOS_OK.has(t));
}

export default function MotivoRevision({ autoMotivo }: { autoMotivo?: string | null }) {
  const motivos = motivosDeRevision(autoMotivo);
  if (motivos.length === 0) return null;

  return (
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
  );
}
