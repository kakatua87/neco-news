import Link from "next/link";
import { getBusqueda } from "@/lib/noticias";
import type { Metadata } from "next";

function normalizeSeccion(s: string): string {
  return s
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n")
    .replace(/\s+/g, "-");
}

export const metadata: Metadata = {
  title: "Buscar noticias",
};

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function BuscarPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const resultados = q.trim() ? await getBusqueda(q) : [];

  return (
    <main className="w-full mx-auto max-w-5xl px-4 md:px-8 py-10 md:py-16">
      <h1 className="font-editorial text-3xl md:text-4xl font-bold mb-2">
        {q.trim() ? (
          <>Resultados para &ldquo;{q}&rdquo;</>
        ) : (
          "Buscar noticias"
        )}
      </h1>
      <p className="text-muted text-base mb-10">
        {q.trim()
          ? `${resultados.length} noticia${resultados.length === 1 ? "" : "s"} encontrada${resultados.length === 1 ? "" : "s"}.`
          : "Escribí un término en el buscador del encabezado para empezar."}
      </p>

      {q.trim() && resultados.length === 0 && (
        <p className="text-muted">No encontramos noticias que coincidan con tu búsqueda.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resultados.map((note) => (
          <article key={note.id} className="group cursor-pointer card-lift rounded-xl overflow-hidden border border-border">
            <Link href={`/${normalizeSeccion(note.seccion)}/${note.slug}`} className="block">
              <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
                {note.imagen_url ? (
                  <img src={note.imagen_url} alt={note.titulo} className="w-full h-full object-cover img-zoom" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <div className="p-5">
                <span className="text-accent text-[11px] font-bold uppercase tracking-widest">{note.seccion}</span>
                <h3 className="font-bold text-base leading-snug mt-2 title-hover line-clamp-2">{note.titulo}</h3>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
