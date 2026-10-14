import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // El mismo sitio responde en el dominio de Vercel y en necobeat.com.ar: se redirige (301) para que Google
  // indexe solo el dominio propio.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "neco-news-seven.vercel.app" }],
        destination: "https://necobeat.com.ar/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: "https",
        hostname: "gjqspmhrnqwavristrpv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Fuentes de noticias
      {
        protocol: "https",
        hostname: "nden.com.ar",
      },
      {
        protocol: "https",
        hostname: "**.nden.com.ar",
      },
      {
        protocol: "https",
        hostname: "diarionecochea.com",
      },
      {
        protocol: "https",
        hostname: "**.diarionecochea.com",
      },
      // CDNs comunes de WordPress
      {
        protocol: "https",
        hostname: "**.wp.com",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
      },
      {
        protocol: "https",
        hostname: "i1.wp.com",
      },
      {
        protocol: "https",
        hostname: "i2.wp.com",
      },
      // Comodín para cualquier https (producción más flexible)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
