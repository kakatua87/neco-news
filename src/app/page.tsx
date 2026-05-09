import Link from "next/link";
import { getPublicadas, getPortadaDelDia } from "@/lib/noticias";
import type { Noticia } from "@/types/noticia";
import BannerZone from "@/components/BannerZone";

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
  const [noticias, portada] = await Promise.all([
    getPublicadas(60),
    getPortadaDelDia(),
  ]);
  const hasNews = noticias.length > 0;

  const hero = portada ?? (hasNews ? noticias[0] : null);
  const restNotes = hasNews ? noticias.filter((n) => n.id !== hero?.id) : [];
  const sideNotes = restNotes.slice(0, 3);
  const bottomNotes = restNotes.slice(3, 6);

  const navSections = hasNews
    ? [...new Set(noticias.map((n) => n.seccion))].slice(0, 6)
    : NAV;

  return (
    <>
      {/* ══════════ HERO + SIDEBAR ══════════ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 lg:gap-8">

            {/* HERO IMAGE */}
            <article className="group relative rounded-xl overflow-hidden cursor-pointer card-lift">
              {hero ? (
                <>
                  <Link href={`/${normalizeSeccion(hero.seccion)}/${hero.slug}`} className="absolute inset-0 z-20" />
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
                        Redacción Neco Now • {timeAgo(hero.fecha_publicacion ?? hero.created_at)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative h-[300px] md:h-[440px] w-full overflow-hidden bg-gray-200 rounded-xl">
                  <img src="/placeholder-hero.png" alt="Neco Now" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <span className="absolute top-4 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded z-10">
                    Destacado
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 z-10">
                    <h1 className="text-white font-extrabold text-xl md:text-3xl lg:text-4xl leading-[1.12] mb-3">
                      Neco Now: Tu portal de noticias de Necochea
                    </h1>
                    <p className="text-white/60 text-sm">Redacción Neco Now</p>
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

              {/* BANNER SIDEBAR */}
              <BannerZone zone="sidebar" className="w-full h-32" />

              {/* TOP STORIES */}
              <div>
                <h3 className="font-extrabold text-lg mb-4">Top Stories</h3>
                <div className="space-y-4">
                  {(hasNews ? sideNotes : DEMO_STORIES.map((d, i) => ({ id: i, titulo: d.title, resumen_seo: d.desc, imagen_url: d.img, seccion: d.section } as any))).map((note: any) => {
                    const content = (
                      <>
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
                      </>
                    );

                    return (
                      <article key={note.id} className="group relative cursor-pointer">
                        {hasNews ? (
                          <Link href={`/${normalizeSeccion(note.seccion)}/${note.slug}`} className="flex gap-3 items-start">
                            {content}
                          </Link>
                        ) : (
                          <div className="flex gap-3 items-start">
                            {content}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

            </aside>

          </div>
        </div>
      </section>

      {/* BANNER HEADER */}
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-4">
        <BannerZone zone="header" className="w-full h-24 md:h-28" />
      </div>

      {/* ══════════ BOTTOM GRID ══════════ */}
      <section className="bg-white border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(hasNews ? bottomNotes : DEMO_STORIES.map((d, i) => ({ id: `demo-${i}`, titulo: d.title, imagen_url: d.img, seccion: d.section, slug: "", cuerpo: d.desc, resumen_seo: d.desc } as any))).map((note: any) => (
              <article key={note.id} className="group cursor-pointer card-lift rounded-xl overflow-hidden border border-border">
                {hasNews ? (
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

      {/* ══════════ ARCHIVO LINK ══════════ */}
      <section className="bg-white border-t border-border">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 text-center">
          <Link href="/archivo" className="inline-flex items-center gap-2 text-accent hover:text-accent-dark text-sm font-bold uppercase tracking-widest transition-colors">
            <span>📁</span> Ver archivo completo de noticias <span>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
