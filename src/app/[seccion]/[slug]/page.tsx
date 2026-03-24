import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Noticia } from "@/types/noticia";

export const revalidate = 60;

type NotaPageProps = {
  params: Promise<{ seccion: string; slug: string }>;
};

async function getNotaBySlug(slug: string): Promise<Noticia | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("noticias")
    .select("*")
    .eq("slug", slug)
    .eq("estado", "publicada")
    .maybeSingle();

  if (error) return null;
  return (data as Noticia | null) ?? null;
}

async function getRelacionadas(seccion: string, id: number): Promise<Noticia[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .eq("seccion", seccion)
    .neq("id", id)
    .order("fecha_publicacion", { ascending: false })
    .limit(4);

  return (data as Noticia[]) ?? [];
}

export async function generateMetadata({ params }: NotaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const nota = await getNotaBySlug(slug);
  if (!nota) return { title: "Nota no encontrada | Neco News" };

  const description = nota.resumen_seo ?? nota.cuerpo.slice(0, 160);
  const url = `/${nota.seccion.toLowerCase()}/${nota.slug}`;

  return {
    title: `${nota.titulo} | Neco News`,
    description,
    openGraph: {
      title: nota.titulo,
      description,
      type: "article",
      url,
      images: nota.imagen_url ? [{ url: nota.imagen_url }] : undefined,
    },
  };
}

export default async function NotaPage({ params }: NotaPageProps) {
  const { slug } = await params;
  const nota = await getNotaBySlug(slug);
  if (!nota) notFound();

  const relacionadas = await getRelacionadas(nota.seccion, nota.id);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: nota.titulo,
    datePublished: nota.fecha_publicacion ?? nota.created_at,
    dateModified: nota.fecha_publicacion ?? nota.created_at,
    articleSection: nota.seccion,
    description: nota.resumen_seo ?? nota.cuerpo.slice(0, 180),
    author: {
      "@type": "Organization",
      name: "Neco News",
    },
    publisher: {
      "@type": "Organization",
      name: "Neco News",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `/${nota.seccion.toLowerCase()}/${nota.slug}`,
    },
    image: nota.imagen_url ? [nota.imagen_url] : undefined,
  };

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 bg-[#f8f6f1] text-[#0f0f0f] min-h-screen">
      <Script
        id="newsarticle-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="text-xs uppercase tracking-widest text-[#c8102e]">{nota.seccion}</p>
      <h1 className="font-serif text-4xl md:text-5xl mt-2">{nota.titulo}</h1>
      <p className="text-sm text-[#0f0f0f]/70 mt-3">
        Publicado:{" "}
        {new Date(nota.fecha_publicacion ?? nota.created_at).toLocaleString("es-AR")}
      </p>

      <div className="ad-slot mt-6">Espacio publicitario 728x90</div>

      <div className="prose prose-zinc max-w-none mt-8 whitespace-pre-line">
        {nota.cuerpo}
      </div>

      {relacionadas.length > 0 && (
        <section className="mt-12 border-t border-[#0f0f0f]/30 pt-6">
          <h2 className="font-serif text-2xl mb-4">Notas relacionadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relacionadas.map((item) => (
              <Link
                key={item.id}
                href={`/${item.seccion.toLowerCase()}/${item.slug}`}
                className="border border-[#0f0f0f]/20 p-4 hover:border-[#c8102e]"
              >
                <p className="text-xs uppercase text-[#c8102e]">{item.seccion}</p>
                <h3 className="font-serif text-xl mt-1">{item.titulo}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
