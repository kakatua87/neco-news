import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60; // 1 minuto para pruebas

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params;
  const slug = p.slug;
  
  let title = "Obituarios";
  const match = slug.match(/obituarios-(\d{4})-(\d{2})/);
  if (match) {
    const MESES_NOMBRES: Record<string, string> = {
      "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
      "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
      "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
    };
    title = `Avisos fúnebres de ${MESES_NOMBRES[match[2]] || match[2]} ${match[1]}`;
  }

  return {
    title: `${title} | Neco Now`,
    description: "Detalles de los avisos fúnebres publicados en Neco Now.",
  };
}

export default async function ObituarioDetallePage({ params }: PageProps) {
  const p = await params;
  const slug = p.slug;
  
  let titulo = "Obituarios";
  let cuerpo = "";
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from("noticias")
      .select("titulo, cuerpo")
      .eq("slug", slug)
      .single();

    if (!error && data) {
      titulo = data.titulo;
      cuerpo = data.cuerpo || "";
    }
  } catch (error) {
    console.error("Error fetching obituario detallado:", error);
  }

  // Parse markdown-like content (### Nombre)
  const lines = cuerpo.split('\n');
  const blocks: { type: 'name' | 'text', content: string }[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'name', content: trimmed.replace(/^###\s*/, '') });
    } else {
      blocks.push({ type: 'text', content: trimmed });
    }
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
            Servicios Fúnebres
          </p>
          <h1 className="font-editorial text-3xl md:text-5xl font-bold text-white leading-tight">
            {titulo}
          </h1>
        </header>

        <div className="p-6 md:p-12">
          {blocks.length > 0 ? (
            <div className="space-y-6 font-serif text-lg leading-relaxed text-ink/90">
              {blocks.map((block, idx) => {
                if (block.type === 'name') {
                  return (
                    <h2 key={idx} className={`font-bold text-xl md:text-2xl text-charcoal font-sans ${idx > 0 ? 'mt-10 pt-6 border-t border-border/40' : ''}`}>
                      {block.content}
                    </h2>
                  );
                }
                
                return (
                  <p key={idx} className="mb-2">
                    {block.content}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted text-lg">
                No se pudo cargar el contenido o aún no hay avisos para este mes.
              </p>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
