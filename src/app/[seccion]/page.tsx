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
    <main className="mx-auto max-w-5xl p-4 md:p-8 bg-[#f8f6f1] min-h-screen">
      <h1 className="font-serif text-4xl capitalize mb-6">{normalized}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {noticias.map((nota) => (
          <article key={nota.id} className="border border-[#0f0f0f]/20 p-4 bg-white">
            <Link href={`/${nota.seccion.toLowerCase()}/${nota.slug}`}>
              <h2 className="font-serif text-2xl hover:text-[#c8102e]">{nota.titulo}</h2>
            </Link>
            <p className="mt-2 text-sm text-[#0f0f0f]/70">
              {nota.resumen_seo ?? nota.cuerpo.slice(0, 180)}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
