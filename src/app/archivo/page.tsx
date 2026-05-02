import Link from "next/link";
import { getNoticiasCountByMonth } from "@/lib/noticias";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archivo de Noticias | Neco News",
  description: "Explorá el historial completo de noticias de Necochea ordenadas por fecha.",
};

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Props = {
  searchParams: Promise<{ mes?: string; anio?: string }>;
};

export default async function ArchivoPage({ searchParams }: Props) {
  const params = await searchParams;
  const hoy = new Date();
  const anio = parseInt(params.anio ?? String(hoy.getFullYear()));
  const mes = parseInt(params.mes ?? String(hoy.getMonth() + 1));

  const counts = await getNoticiasCountByMonth(anio, mes);

  // Calcular primer día del mes y cantidad de días
  const primerDia = new Date(anio, mes - 1, 1).getDay(); // 0=Dom
  const diasEnMes = new Date(anio, mes, 0).getDate();

  // Navegación mes anterior / siguiente
  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;
  const mesSig = mes === 12 ? 1 : mes + 1;
  const anioSig = mes === 12 ? anio + 1 : anio;

  const hoyDia = hoy.getDate();
  const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-lg flex h-14">
        <div className="bg-charcoal flex items-center px-5 md:px-8">
          <Link href="/">
            <img src="/logo-dark.png" alt="Neco News" className="h-8 w-auto object-contain" />
          </Link>
        </div>
        <div className="bg-white flex-1 flex items-center px-4 md:px-8 border-b border-border">
          <nav className="text-[11px] font-bold uppercase tracking-widest text-muted flex items-center gap-2">
            <Link href="/" className="hover:text-accent transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-ink">Archivo</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 md:px-8 py-10 md:py-16">
        <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-2">Archivo</h1>
        <p className="text-muted text-base mb-10">
          Explorá todas las noticias publicadas por fecha.
        </p>

        {/* Calendario */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden mb-12">
          {/* Cabecera del mes */}
          <div className="flex items-center justify-between px-6 py-4 bg-charcoal text-white">
            <Link
              href={`/archivo?anio=${anioPrev}&mes=${mesPrev}`}
              className="text-white/70 hover:text-white transition-colors text-xl font-bold px-2"
            >
              ‹
            </Link>
            <h2 className="text-xl font-bold tracking-wide">
              {MESES[mes]} {anio}
            </h2>
            <Link
              href={`/archivo?anio=${anioSig}&mes=${mesSig}`}
              className="text-white/70 hover:text-white transition-colors text-xl font-bold px-2"
            >
              ›
            </Link>
          </div>

          {/* Grilla días semana */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-border">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-[10px] font-extrabold uppercase tracking-widest text-muted py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Grilla días del mes */}
          <div className="grid grid-cols-7">
            {/* Celdas vacías del inicio */}
            {Array.from({ length: primerDia }).map((_, i) => (
              <div key={`empty-${i}`} className="h-16 border-b border-r border-border/50" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const count = counts[dia] ?? 0;
              const esHoy = esMesActual && dia === hoyDia;
              const tieneNoticias = count > 0;

              return (
                <div
                  key={dia}
                  className={`h-16 border-b border-r border-border/50 flex flex-col items-center justify-center gap-1 transition-colors
                    ${tieneNoticias ? "cursor-pointer hover:bg-accent/5" : ""}
                    ${esHoy ? "bg-accent/5" : ""}
                  `}
                >
                  {tieneNoticias ? (
                    <Link
                      href={`/archivo/${anio}/${mes}/${dia}`}
                      className="flex flex-col items-center gap-1 w-full h-full justify-center"
                    >
                      <span className={`text-sm font-bold ${esHoy ? "text-accent" : "text-ink"}`}>
                        {dia}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span className="text-[9px] font-semibold text-muted">
                        {count} nota{count !== 1 ? "s" : ""}
                      </span>
                    </Link>
                  ) : (
                    <span className={`text-sm ${esHoy ? "text-accent font-bold" : "text-muted/50"}`}>
                      {dia}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Volver */}
        <div className="text-center">
          <Link href="/" className="text-accent text-sm font-semibold hover:underline">
            ← Volver a la portada
          </Link>
        </div>
      </main>
    </div>
  );
}
