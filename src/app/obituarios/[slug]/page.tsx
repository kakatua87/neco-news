import { Metadata } from "next";
import Link from "next/link";
import * as cheerio from "cheerio";

export const revalidate = 14400; // 4 horas

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params;
  
  // Format title from slug
  let title = p.slug.replace(/-/g, " ").replace(/\s\d{5,}$/, "").trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  title = title.replace("funebres", "fúnebres").replace("dia", "día");

  return {
    title: `${title} | Neco Now`,
    description: "Detalles del aviso fúnebre publicado en Neco Now.",
  };
}

export default async function ObituarioDetallePage({ params }: PageProps) {
  const p = await params;
  const slug = p.slug;
  
  let contentParagraphs: string[] = [];
  
  // Format title
  let title = slug.replace(/-/g, " ").replace(/\s\d{5,}$/, "").trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);
  title = title.replace("funebres", "fúnebres").replace("dia", "día");

  try {
    const res = await fetch(`https://tsnnecochea.com.ar/funebres/${slug}/`, {
      next: { revalidate: 14400 },
    });
    
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      // Extraemos todos los párrafos dentro del artículo principal
      $("article p").each((i, el) => {
        const text = $(el).text().trim();
        // Filtramos textos vacíos o la firma de origen
        if (text && !text.includes("Por Redacción TSN")) {
          contentParagraphs.push(text);
        }
      });
    }
  } catch (error) {
    console.error("Error fetching obituario detallado:", error);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 md:px-8 py-10 md:py-16">
      <Link 
        href="/obituarios" 
        className="inline-flex items-center text-sm font-bold uppercase tracking-wider text-accent hover:text-accent-dark mb-8 transition-colors"
      >
        <span className="mr-2">←</span> Volver a Obituarios
      </Link>

      <article className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
        <header className="bg-charcoal px-6 md:px-10 py-10 text-center border-b-[4px] border-accent">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60 mb-4">
            Avisos fúnebres de la jornada
          </p>
          <h1 className="font-editorial text-3xl md:text-5xl font-bold text-white leading-tight">
            {title}
          </h1>
        </header>

        <div className="p-6 md:p-12">
          {contentParagraphs.length > 0 ? (
            <div className="space-y-8 font-serif text-lg leading-relaxed text-ink/90">
              {contentParagraphs.map((parrafo, idx) => {
                // Destacar el nombre (que normalmente viene en mayúsculas antes de Q.E.P.D)
                const lines = parrafo.split("\n");
                
                return (
                  <div key={idx} className="pb-8 border-b border-border/40 last:border-0 last:pb-0">
                    {lines.map((line, lIdx) => {
                      const text = line.trim();
                      if (!text) return null;
                      
                      // Si la línea es completamente mayúsculas, probable que sea el nombre
                      const isName = text.length > 5 && text === text.toUpperCase() && !text.includes("Q.E.P.D");
                      
                      if (isName) {
                        return (
                          <h2 key={lIdx} className="font-bold text-xl md:text-2xl text-charcoal mb-2 font-sans">
                            {text}
                          </h2>
                        );
                      }
                      
                      return (
                        <p key={lIdx} className="mb-2">
                          {text}
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted text-lg">
                No se pudo cargar el contenido del aviso fúnebre. Puede que ya no esté disponible.
              </p>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
