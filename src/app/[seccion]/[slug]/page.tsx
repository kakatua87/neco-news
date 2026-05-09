import { getNoticiaBySlug } from "@/lib/noticias";
import { notFound } from "next/navigation";
import Link from "next/link";
import React from "react";
import BannerZone from "@/components/BannerZone";

type Props = { params: Promise<{ seccion: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const noticia = await getNoticiaBySlug(slug);
  if (!noticia) return { title: "Noticia no encontrada" };
  return {
    title: `${noticia.titulo} | Neco Now`,
    description: noticia.resumen_seo || noticia.cuerpo.slice(0, 160),
    openGraph: {
      title: noticia.titulo,
      siteName: "Neco Now",
      description: noticia.resumen_seo || noticia.cuerpo.slice(0, 160),
      images: noticia.imagen_url ? [{ url: noticia.imagen_url }] : [],
    },
  };
}

export default async function NoticiaPage({ params }: Props) {
  const { slug } = await params;
  const noticia = await getNoticiaBySlug(slug);
  if (!noticia) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: noticia.titulo,
    image: noticia.imagen_url ? [noticia.imagen_url] : [],
    datePublished: noticia.fecha_publicacion || noticia.created_at,
    author: [{ "@type": "Organization", name: "Redacción Neco Now" }],
  };

  const fecha = new Date(noticia.fecha_publicacion || noticia.created_at).toLocaleDateString("es-AR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const parrafos = noticia.cuerpo.split("\n\n").filter((p) => p.trim());

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="mx-auto max-w-[880px] px-4 md:px-8 py-10 md:py-16 flex-1">
        {/* Breadcrumb */}
        <nav className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted mb-8 flex items-center gap-2">
          <Link href="/" className="hover:text-accent transition-colors">Inicio</Link>
          <span>/</span>
          <Link href={`/${noticia.seccion.toLowerCase()}`} className="hover:text-accent transition-colors">{noticia.seccion}</Link>
        </nav>

        <h1 className="font-editorial text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.08] font-bold mb-6">
          {noticia.titulo}
        </h1>

        {noticia.resumen_seo && (
          <p className="text-lg md:text-xl text-muted font-editorial leading-relaxed border-l-4 border-accent pl-6 mb-8">
            {noticia.resumen_seo}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted uppercase tracking-wider py-4 border-y border-border mb-10">
          <span>Por <strong className="text-ink">Redacción Neco Now</strong></span>
          <span>•</span>
          <span>{fecha}</span>
        </div>

        {noticia.imagen_url && (
          <figure className="mb-10 rounded-xl overflow-hidden shadow-md">
            <img src={noticia.imagen_url} alt={noticia.titulo} className="w-full h-auto object-cover max-h-[480px]" />
          </figure>
        )}

        <div className="font-editorial text-lg md:text-xl leading-[1.85] space-y-6">
          {parrafos.map((p, i) => (
            <React.Fragment key={i}>
              {i === 0 ? (
                <p className="text-xl md:text-2xl font-medium text-ink/90 leading-relaxed">{p}</p>
              ) : (
                <p>{p}</p>
              )}
              {i === 0 && <BannerZone zone="in-article" className="w-full h-24 my-6" />}
            </React.Fragment>
          ))}
        </div>

        {(noticia.instagram_text || noticia.twitter_text) && (
          <div className="mt-14 bg-accent-light rounded-2xl p-8 border border-accent/10">
            <h3 className="text-accent text-[11px] font-extrabold uppercase tracking-[0.15em] mb-6 pb-3 border-b border-accent/20 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full" />
              Cobertura en Redes
            </h3>
            {noticia.twitter_text && (
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Para X (Twitter)</p>
                <p className="text-sm text-ink bg-white p-4 rounded-lg italic border border-border">&ldquo;{noticia.twitter_text}&rdquo;</p>
              </div>
            )}
            {noticia.instagram_text && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Para Instagram</p>
                <p className="text-sm text-ink bg-white p-4 rounded-lg border border-border whitespace-pre-wrap">{noticia.instagram_text}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
