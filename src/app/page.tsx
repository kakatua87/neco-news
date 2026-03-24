import Link from "next/link";
import LiveClock from "@/components/LiveClock";
import NewsTicker from "@/components/NewsTicker";
import { getPublicadas } from "@/lib/noticias";
import type { Noticia } from "@/types/noticia";

const FALLBACK_SECTIONS = ["Politica", "Policiales", "Deportes", "Sociedad"];

function bySection(noticias: Noticia[]) {
  return noticias.reduce<Record<string, Noticia[]>>((acc, noticia) => {
    if (!acc[noticia.seccion]) acc[noticia.seccion] = [];
    if (acc[noticia.seccion].length < 4) acc[noticia.seccion].push(noticia);
    return acc;
  }, {});
}

export default async function Home() {
  const noticias = await getPublicadas(60);
  const principal = noticias[0];
  const secundarias = noticias.slice(1, 3);
  const masLeidas = noticias.slice(0, 5);
  const ticker = noticias.slice(0, 10).map((n) => n.titulo);
  const secciones = Object.keys(bySection(noticias));
  const gridSections = secciones.length > 0 ? secciones : FALLBACK_SECTIONS;
  const grouped = bySection(noticias);

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#0f0f0f]">
      <header className="border-b-2 border-[#0f0f0f]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-serif text-4xl font-bold tracking-tight">
            Neco News
          </Link>
          <nav className="hidden md:flex gap-4 text-sm uppercase">
            {gridSections.map((seccion) => (
              <Link
                key={seccion}
                href={`/${encodeURIComponent(seccion.toLowerCase())}`}
                className="hover:text-[#c8102e] transition-colors"
              >
                {seccion}
              </Link>
            ))}
          </nav>
          <LiveClock />
        </div>
      </header>

      <NewsTicker items={ticker} />

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <section className="space-y-8">
          <div className="ad-slot">Espacio publicitario 970x90</div>

          {principal ? (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <article className="md:col-span-2 border-b border-[#0f0f0f]/20 pb-4">
                <p className="text-xs uppercase tracking-wide text-[#c8102e] mb-1">
                  {principal.seccion}
                </p>
                <Link href={`/${principal.seccion.toLowerCase()}/${principal.slug}`}>
                  <h1 className="font-serif text-3xl md:text-5xl leading-tight hover:text-[#c8102e]">
                    {principal.titulo}
                  </h1>
                </Link>
                <p className="mt-3 text-base text-[#0f0f0f]/80">
                  {principal.resumen_seo ?? principal.cuerpo.slice(0, 180)}
                </p>
              </article>
              <div className="space-y-4">
                {secundarias.map((item) => (
                  <article key={item.id} className="border-b border-[#0f0f0f]/20 pb-3">
                    <p className="text-xs uppercase tracking-wide text-[#c8102e] mb-1">
                      {item.seccion}
                    </p>
                    <Link href={`/${item.seccion.toLowerCase()}/${item.slug}`}>
                      <h2 className="font-serif text-xl hover:text-[#c8102e]">{item.titulo}</h2>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-lg">No hay noticias publicadas todavía.</p>
          )}

          {gridSections.map((seccion) => (
            <section key={seccion}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-2xl">{seccion}</h3>
                <div className="h-px bg-[#0f0f0f]/30 flex-1 ml-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(grouped[seccion] ?? []).map((nota) => (
                  <article key={nota.id} className="border border-[#0f0f0f]/15 p-4">
                    <Link href={`/${nota.seccion.toLowerCase()}/${nota.slug}`}>
                      <h4 className="font-serif text-xl hover:text-[#c8102e]">{nota.titulo}</h4>
                    </Link>
                    <p className="text-sm text-[#0f0f0f]/75 mt-2 line-clamp-3">
                      {nota.resumen_seo ?? nota.cuerpo.slice(0, 140)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>

        <aside className="space-y-6">
          <div className="ad-slot">Espacio publicitario 300x250</div>
          <section className="border border-[#0f0f0f] p-4">
            <h3 className="font-serif text-2xl mb-3">Lo mas leido</h3>
            <ol className="space-y-3">
              {masLeidas.map((nota, index) => (
                <li key={nota.id} className="flex gap-2">
                  <span className="font-bold text-[#c8102e]">{index + 1}.</span>
                  <Link
                    href={`/${nota.seccion.toLowerCase()}/${nota.slug}`}
                    className="hover:text-[#c8102e]"
                  >
                    {nota.titulo}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </main>

      <footer className="border-t-2 border-[#0f0f0f] mt-10">
        <div className="mx-auto max-w-7xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-serif text-2xl">Neco News</h4>
            <p className="text-sm mt-2">Portal de noticias de Necochea, Buenos Aires.</p>
          </div>
          <div className="text-sm">
            <p className="mb-1">
              Secciones: {gridSections.join(" · ")}
            </p>
            <p>Contacto: contacto@neconews.com.ar</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
