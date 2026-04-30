import type { MetadataRoute } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Noticia } from "@/types/noticia";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://neco-news-seven.vercel.app";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("noticias")
    .select("slug, seccion, fecha_publicacion, created_at")
    .eq("estado", "publicada")
    .order("fecha_publicacion", { ascending: false });

  const notas = (data as Pick<Noticia, "slug" | "seccion" | "fecha_publicacion" | "created_at">[]) ?? [];

  const routes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...notas.map((nota) => ({
      url: `${baseUrl}/${nota.seccion.toLowerCase()}/${nota.slug}`,
      lastModified: new Date(nota.fecha_publicacion ?? nota.created_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];

  return routes;
}
