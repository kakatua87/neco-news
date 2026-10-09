import { permanentRedirect } from "next/navigation";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import { buscarRedireccionSeccion } from "@/lib/seccion-redirects";
import { decodificarSeguro } from "@/lib/seccion-url";
import type { Noticia } from "@/types/noticia";
import BannerZone from "@/components/BannerZone";
import SeccionGrid from "./SeccionGrid";

const PAGE_SIZE = 9;

type SeccionPageProps = {
  params: Promise<{ seccion: string }>;
};

export default async function SeccionPage({ params }: SeccionPageProps) {
  const { seccion } = await params;
  const normalized = decodificarSeguro(seccion).toLowerCase();
  const supabase = createSupabasePublicClient();
  const { data } = await supabase
    .from("noticias")
    .select("*")
    .eq("estado", "publicada")
    .ilike("seccion", normalized.replaceAll("-", " "))
    .order("fecha_publicacion", { ascending: false })
    .range(0, PAGE_SIZE);

  const traidas = (data as Noticia[]) ?? [];
  // Sin notas: puede ser una sección que se renombró; si es así, 301 al nombre nuevo.
  if (traidas.length === 0) {
    const destino = await buscarRedireccionSeccion(normalized);
    if (destino) permanentRedirect(destino);
  }
  const hasMore = traidas.length > PAGE_SIZE;
  const noticias = traidas.slice(0, PAGE_SIZE);

  return (
    <>
      <section className="bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <div className="mb-10">
            <h1 className="font-editorial text-4xl md:text-5xl font-bold capitalize text-ink">
              {normalized}
            </h1>
            <div className="w-full h-1 bg-accent mt-4"></div>
          </div>

          <BannerZone zone={`seccion-${normalized}`} className="w-full h-24 md:h-28 mb-10" />

          <SeccionGrid seccion={normalized} initialNoticias={noticias} initialHasMore={hasMore} />
        </div>
      </section>
    </>
  );
}
