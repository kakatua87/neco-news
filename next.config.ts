import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
