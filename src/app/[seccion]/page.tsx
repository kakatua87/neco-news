import { notFound, permanentRedirect } from "next/navigation";
import { SECCIONES_MENU, seccionSlug } from "@/lib/secciones";
import { createSupabasePublicClient } from "@/lib/supabase/server";
import { buscarRedireccionSeccion } from "@/lib/seccion-redirects";
import { decodificarSeguro } from "@/lib/seccion-url";
import { SELECT_LISTA, soloImagenPropia, type NoticiaLista } from "@/types/noticia";
import { falloLectura, getCuerposPorId } from "@/lib/noticias";
import BannerZone from "@/components/BannerZone";
import SeccionGrid from "./SeccionGrid";

const PAGE_SIZE = 9;

// La consulta usa el cliente público sin cookies: sin esto la sección queda cacheada indefinidamente y
// sigue mostrando notas ya eliminadas. Se regenera como máximo cada 5 minutos y los cambios del panel la invalidan
// al instante (revalidarPortal).
export const revalidate = 300;

type SeccionPageProps = {
  params: Promise<{ seccion: string }>;
};

export default async function SeccionPage({ params }: SeccionPageProps) {
  const { seccion } = await params;
  const normalized = decodificarSeguro(seccion).toLowerCase();
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("noticias")
    .select(SELECT_LISTA)
    .eq("estado", "publicada")
    .ilike("seccion", normalized.replaceAll("-", " "))
    .order("fecha_publicacion", { ascending: false })
    .range(0, PAGE_SIZE);

  // Un error de la base no es "sección sin notas" (daría una página vacía o un 404 cacheado): se lanza, ver falloLectura.
  if (error) falloLectura(`Error al obtener la sección ${normalized}`, error);
  const traidas = ((data as unknown as NoticiaLista[]) ?? []).map(soloImagenPropia);
  // Sin notas: puede ser una sección que se renombró; si es así, 301 al nombre nuevo.
  if (traidas.length === 0) {
    const destino = await buscarRedireccionSeccion(normalized);
    if (destino) permanentRedirect(destino);
    // Sin notas, sin redirección y fuera de las secciones del menú (p. ej. /opinión mal escrita o una ruta
    // inventada): 404 real, no una página vacía con 200 que Google marca como "rastreada, sin indexar".
    const slugPedido = seccionSlug(normalized);
    if (!SECCIONES_MENU.some((s) => seccionSlug(s) === slugPedido)) notFound();
  }
  const hasMore = traidas.length > PAGE_SIZE;
  const visibles = traidas.slice(0, PAGE_SIZE);
  // Las listas no traen `cuerpo` (pesa mucho); solo se pide, de respaldo, para las notas sin `resumen_seo`.
  const cuerpos = await getCuerposPorId(visibles.filter((n) => n.resumen_seo == null).map((n) => String(n.id)));
  const noticias = visibles.map((n) => (cuerpos.has(String(n.id)) ? { ...n, cuerpo: cuerpos.get(String(n.id)) } : n));

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
