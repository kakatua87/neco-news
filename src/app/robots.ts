import type { MetadataRoute } from "next";

// Robots que no aportan visitas (SEO de terceros, entrenamiento de IA, buscadores sin público en Argentina) y que
// gastan transferencia del plan gratis de Vercel y de Supabase Storage. Solo lo respetan los robots educados.
// Google, Bing y el rastreador de vistas previas de Facebook/Meta (facebookexternalhit) siguen permitidos.
const ROBOTS_BLOQUEADOS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "Bytespider",
  "Amazonbot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://necobeat.com.ar";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      {
        userAgent: ROBOTS_BLOQUEADOS,
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
