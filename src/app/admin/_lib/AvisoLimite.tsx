/** Aviso cuando una lista del panel está cortada por límite (antes se truncaba sin decir nada). */
export default function AvisoLimite({ mostrados, total, cosa }: { mostrados: number; total: number; cosa: string }) {
  if (total <= mostrados) return null;
  return (
    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
      Mostrando {mostrados} de {total} {cosa}. Las más antiguas no aparecen en esta lista hasta que se procesen o descarten otras.
    </p>
  );
}
