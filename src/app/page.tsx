import Image from "next/image";
import Link from "next/link";
import { getPublicadas } from "@/lib/noticias";
import type { Noticia } from "@/types/noticia";

/* ═══ Helpers ═══ */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

const NAV = ["Política", "Economía", "Policiales", "Local", "Deportes", "Sociedad"];

const DEMO_TRENDING = [
  "El puerto de Quequén bate récord de exportaciones.",
  "Nuevas inversiones en el parque industrial de Necochea.",
  "Debate por la ampliación de la red de gas en la costa.",
  "Tecnología: Necochea avanza en conectividad digital.",
];

const DEMO_STORIES = [
  { title: "El municipio presentó el plan de obras 2026", desc: "Se anunciaron mejoras en infraestructura vial y nuevos espacios verdes...", img: "/placeholder-1.png", section: "Economía" },
  { title: "Impulso a la producción agropecuaria local", desc: "Productores de la zona costera apuestan a cultivos sustentables...", img: "/placeholder-2.png", section: "Local" },
  { title: "Turismo: la costa atlántica lidera las reservas", desc: "Necochea se posiciona como destino preferido para el verano...", img: "/placeholder-3.png", section: "Sociedad" },
];

/* ═══ Page ═══ */

export default async function Home() {
  const noticias = await getPublicadas(60);
  const hasNews = noticias.length > 0;

  const hero = hasNews ? noticias[0] : null;
  const sideNotes = hasNews ? noticias.slice(1, 4) : [];
  const bottomNotes = hasNews ? noticias.slice(4, 7) : [];

  const navSections = hasNews
    ? [...new Set(noticias.map((n) => n.seccion))].slice(0, 6)
    : NAV;

  return (
    <div className="min-h-screen bg-white text-ink font-sans flex flex-col">

      {/* ══════════ SPLIT HEADER ══════════ */}
      <header className="sticky top-0 z-50 shadow-lg">
        <div className="flex">

          {/* LEFT: Charcoal + Logo (compacto) */}
          <div className="bg-charcoal flex items-center px-5 md:px-8 py-4">
            <Link href="/" className="flex items-center gap-3">
              {/* N Icon */}
              <Image
                src="/logo-icon.png"
                alt="N"
                width={225}
                height={239}
                className="h-12 md:h-16 lg:h-[70px] w-auto object-contain"
                priority
              />
              {/* Text — optimizeLegibility + geometricPrecision */}
              <div className="flex flex-col leading-none">
                <span className="logo-text text-white font-extrabold text-[1.6rem] md:text-[2rem] lg:text-[2.1rem] tracking-tight">NECO</span>
                <span className="logo-text text-white font-extrabold text-[1.6rem] md:text-[2rem] lg:text-[2.1rem] tracking-tight">NEWS</span>
              </div>
            </Link>
          </div>

          {/* RIGHT: White + Subtitle + Nav */}
          <div className="bg-white flex-1 flex flex-col border-b border-border">

            {/* Subtítulo — marquesina animada */}
            <div className="overflow-hidden pt-2 pb-1.5 border-b-2 border-accent">
              <span className="subtitle-marquee text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
                Diario Digital &nbsp;<span className="text-accent">|</span>&nbsp; Necochea, Argentina &nbsp;&nbsp;&nbsp; <span className="text-accent">•</span> &nbsp;&nbsp;&nbsp; Diario Digital &nbsp;<span className="text-accent">|</span>&nbsp; Necochea, Argentina &nbsp;&nbsp;&nbsp; <span className="text-accent">•</span> &nbsp;&nbsp;&nbsp;
              </span>
            </div>

            {/* Nav + Botón */}
            <div className="flex-1 flex items-center justify-between px-4 md:px-8">
              <nav className="hidden md:flex items-center gap-4 lg:gap-6">
                {navSections.map((s) => (
                  <Link
                    key={s}
                    href={`/${encodeURIComponent(s.toLowerCase())}`}
                    className="text-[13px] font-bold uppercase tracking-wider text-ink/70 hover:text-accent transition-colors"
                  >
                    {s}
                  </Link>
                ))}
              </nav>

              <button className="md:hidden text-ink" aria-label="Menú">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <Link href="/admin" className="bg-accent hover:bg-accent-dark text-white text-[13px] font-bold px-5 py-2.5 rounded-md transition-colors flex items-center gap-1.5">
                <span>★</span> Suscribite
              </Link>
            </div>

          </div>

        </div>
      </header>

      {/* ══════════ HERO + SIDEBAR ══════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8">

            {/* HERO IMAGE */}
            <article className="group relative rounded-xl overflow-hidden cursor-pointer card-lift">
              {hero ? (
                <>
                  <Link href={`/${hero.seccion.toLowerCase()}/${hero.slug}`} className="absolute inset-0 z-20" />
                  <div className="relative h-[300px] md:h-[440px] w-full overflow-hidden bg-gray-200">
                    {hero.imagen_url ? (
                      <img src={hero.imagen_url} alt={hero.titulo} className="w-full h-full object-cover img-zoom" />
                    ) : (
                      <img src="/placeholder-hero.png" alt="" className="w-full h-full object-cover img-zoom" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <span className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded z-10">
                      {hero.seccion}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
                      <h1 className="text-white font-extrabold text-xl md:text-3xl lg:text-4xl leading-[1.12] mb-3">
                        {hero.titulo}
                      </h1>
                      <p className="text-white/60 text-sm">
                        Redacción Neco News • {timeAgo(hero.fecha_publicacion ?? hero.created_at)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Demo hero when no news */
                <div className="relative h-[300px] md:h-[440px] w-full overflow-hidden bg-gray-200 rounded-xl">
                  <img src="/placeholder-hero.png" alt="Neco News" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded z-10">
                    Destacado
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
                    <h1 className="text-white font-extrabold text-xl md:text-3xl lg:text-4xl leading-[1.12] mb-3">
                      Neco News: Tu portal de noticias de Necochea
                    </h1>
                    <p className="text-white/60 text-sm">Redacción Neco News</p>
                  </div>
                </div>
              )}
            </article>

            {/* SIDEBAR: Trending + Top Stories */}
            <aside className="flex flex-col gap-6">

              {/* TRENDING NOW */}
              <div className="border border-border rounded-xl p-5">
                <h3 className="font-extrabold text-lg mb-4 pb-2 border-b border-border">Trending Now</h3>
                <ol className="space-y-3">
                  {(hasNews ? sideNotes.map(n => n.titulo) : DEMO_TRENDING).map((title, i) => (
                    <li key={i} className="flex gap-3 items-start text-sm">
                      <span className="font-bold text-accent text-base">{i + 1}.</span>
                      <span className="font-medium leading-snug">{title}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* TOP STORIES */}
              <div>
                <h3 className="font-extrabold text-lg mb-4">Top Stories</h3>
                <div className="space-y-4">
                  {(hasNews ? sideNotes : DEMO_STORIES.map((d, i) => ({ id: i, titulo: d.title, resumen_seo: d.desc, imagen_url: d.img, seccion: d.section } as any))).map((note: any) => (
                    <article key={note.id} className="group flex gap-3 items-start cursor-pointer">
                      {hasNews ? (
                        <Link href={`/${note.seccion.toLowerCase()}/${note.slug}`} className="absolute inset-0 z-10" />
                      ) : null}
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {note.imagen_url && (
                          <img src={note.imagen_url} alt="" className="w-full h-full object-cover img-zoom" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold leading-snug title-hover line-clamp-2 mb-0.5">
                          {note.titulo}
                        </h4>
                        <p className="text-xs text-muted line-clamp-2">
                          {note.resumen_seo ?? note.cuerpo?.slice(0, 80) ?? ""}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

            </aside>

          </div>
        </div>
      </section>

      {/* ══════════ BOTTOM GRID (3 cards con imagen grande) ══════════ */}
      <section className="bg-white border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(hasNews ? bottomNotes : DEMO_STORIES.map((d, i) => ({ id: `demo-${i}`, titulo: d.title, imagen_url: d.img, seccion: d.section, slug: "", cuerpo: d.desc, resumen_seo: d.desc } as any))).map((note: any) => (
              <article key={note.id} className="group cursor-pointer card-lift rounded-xl overflow-hidden border border-border">
                {hasNews ? (
                  <Link href={`/${note.seccion.toLowerCase()}/${note.slug}`} className="block">
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
                ) : (
                  <div>
                    <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100">
                      <img src={note.imagen_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5">
                      <span className="text-accent text-[11px] font-bold uppercase tracking-widest">{note.seccion}</span>
                      <h3 className="font-bold text-base leading-snug mt-2 line-clamp-2">{note.titulo}</h3>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-charcoal mt-auto">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-icon.png" alt="N" width={225} height={239} className="h-8 w-auto object-contain" />
            <span className="text-white font-extrabold text-xl tracking-tight">NECO NEWS</span>
          </Link>
          <nav className="flex flex-wrap justify-center gap-5">
            {NAV.map((s) => (
              <Link key={s} href={`/${s.toLowerCase()}`} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors">{s}</Link>
            ))}
          </nav>
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} Neco Media</p>
        </div>
      </footer>

    </div>
  );
}
