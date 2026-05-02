import Link from "next/link";
import { getNoticiasByFecha } from "@/lib/noticias";
import type { Metadata } from "next";
import type { Noticia } from "@/types/noticia";

type Props = {
  params: Promise<{ anio: string; mes: string; dia: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { anio, mes, dia } = await params;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  const fechaStr = fecha.toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  return {
    title: `Noticias del ${fechaStr} | Neco News`,
    description: `Todas las noticias publicadas por Neco News el ${fechaStr}.`,
  };
}

function timeAgo(fechaStr: string): string {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default async function ArchivoFechaPage({ params }: Props) {
  const { anio, mes, dia } = await params;
  const anioNum = Number(anio);
  const mesNum = Number(mes);
  const diaNum = Number(dia);

  const noticias = await getNoticiasByFecha(anioNum, mesNum, diaNum);

  const fecha = new Date(anioNum, mesNum - 1, diaNum);
  const fechaStr = fecha.toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

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
            <Link href={`/archivo?anio=${anio}&mes=${mes}`} className="hover:text-accent transition-colors">Archivo</Link>
            <span>/</span>
            <span className="text-ink capitalize">{fechaStr}</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 md:px-8 py-10 md:py-16">
        <div className="mb-8">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-accent mb-2">Archivo</p>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold capitalize">{fechaStr}</h1>
          <p className="text-muted mt-2">
            {noticias.length > 0
              ? `${noticias.length} noticia${noticias.length !== 1 ? "s" : ""} publicada${noticias.length !== 1 ? "s" : ""}`
              : "Sin noticias publicadas este día."}
          </p>
        </div>

        {noticias.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg font-semibold">No hay noticias para esta fecha.</p>
            <Link href="/archivo" className="text-accent text-sm font-semibold hover:underline mt-4 inline-block">
              ← Ver calendario
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {noticias.map((nota: Noticia) => (
              <article
                key={nota.id}
                className="flex gap-4 p-4 rounded-xl border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
              >
                {nota.imagen_url && (
                  <img
                    src={nota.imagen_url}
                    alt={nota.titulo}
                    className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                      {nota.seccion}
                    </span>
                    {nota.fecha_publicacion && (
                      <>
                        <span className="text-border">·</span>
                        <span className="text-[10px] text-muted">{timeAgo(nota.fecha_publicacion)}</span>
                      </>
                    )}
                  </div>
                  <Link href={`/${nota.seccion.toLowerCase()}/${nota.slug}`}>
                    <h2 className="font-editorial text-lg font-bold leading-snug group-hover:text-accent transition-colors">
                      {nota.titulo}
                    </h2>
                  </Link>
                  {nota.resumen_seo && (
                    <p className="text-muted text-sm mt-1 line-clamp-2">{nota.resumen_seo}</p>
                  )}
                  {nota.fuente && (
                    <p className="text-[10px] text-muted/70 mt-1">Fuente: {nota.fuente}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-12 flex justify-between items-center border-t border-border pt-8">
          <Link href={`/archivo?anio=${anio}&mes=${mes}`} className="text-accent text-sm font-semibold hover:underline">
            ← Ver calendario de {fecha.toLocaleDateString("es-AR", { month: "long" })}
          </Link>
          <Link href="/" className="text-accent text-sm font-semibold hover:underline">
            Ir a la portada →
          </Link>
        </div>
      </main>
    </div>
  );
}
