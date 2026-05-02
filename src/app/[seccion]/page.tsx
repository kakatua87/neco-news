import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Noticia } from "@/types/noticia";

type SeccionPageProps = {
  params: Promise<{ seccion: string }>;
};

export default async function SeccionPage({ params }: SeccionPageProps) {
  const { seccion } = await params;
  const normalized = decodeURIComponent(seccion).toLowerCase();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .ilike("seccion", normalized.replaceAll("-", " "))
    .order("fecha_publicacion", { ascending: false })
    .limit(30);

  const noticias = (data as Noticia[]) ?? [];

  return (
    <>
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="mb-10">
            <h1 className="font-editorial text-4xl md:text-5xl font-bold capitalize text-ink">
              {normalized}
            </h1>
            <div className="w-16 h-1 bg-accent mt-4"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {noticias.map((nota) => (
              <article key={nota.id} className="group cursor-pointer card-lift rounded-xl overflow-hidden border border-border">
                <Link href={`/${nota.seccion.toLowerCase()}/${nota.slug}`} className="block h-full flex flex-col">
                  <div className="w-full aspect-[4/3] overflow-hidden bg-gray-100 shrink-0">
                    {nota.imagen_url ? (
                      <img src={nota.imagen_url} alt={nota.titulo} className="w-full h-full object-cover img-zoom" />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-accent text-[11px] font-bold uppercase tracking-widest mb-2">{nota.seccion}</span>
                    <h2 className="font-editorial text-xl font-bold leading-snug mb-3 title-hover line-clamp-3">
                      {nota.titulo}
                    </h2>
                    <p className="text-sm text-muted line-clamp-3 mt-auto">
                      {nota.resumen_seo ?? nota.cuerpo.slice(0, 150) + "..."}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
          
          {noticias.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted">No se encontraron noticias en esta sección.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
