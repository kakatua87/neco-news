/**
 * Estado de carga del panel. Al existir, Next.js puede precargar (prefetch parcial) cada sección
 * y mostrar este esqueleto al instante al cambiar de pestaña, en vez de dejar la pantalla anterior
 * congelada hasta que el servidor termine de armar la página nueva.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-8 w-56 rounded-lg bg-gray-200" />
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col md:flex-row overflow-hidden rounded-xl border border-border bg-white">
            <div className="h-32 md:h-36 md:w-48 flex-shrink-0 bg-gray-200" />
            <div className="flex-1 space-y-3 p-5">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="h-6 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-2/3 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
