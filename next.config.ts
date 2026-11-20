import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No avisar con qué framework está hecho el sitio (cabecera x-powered-by).
  poweredByHeader: false,
  // El mismo sitio responde en el dominio de Vercel y en necobeat.com.ar: se redirige (301) para que Google
  // indexe solo el dominio propio.
  async redirects() {
    return [
      {
        // Se excluye el archivo de verificación de Search Console de la propiedad de Vercel.
        source: "/:path((?!googlee0c3dbe116f64874\\.html$).*)",
        has: [{ type: "host", value: "neco-news-seven.vercel.app" }],
        destination: "https://necobeat.com.ar/:path*",
        permanent: true,
      },
    ];
  },
  // Cabeceras de seguridad para todas las rutas. No se define una CSP de scripts completa (el sitio carga OneSignal y
  // código en línea de Next): solo las directivas que no pueden romper nada y cierran lo más riesgoso.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nadie puede incrustar el sitio ni el panel en otra página (clickjacking).
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
  // El sitio muestra las fotos con <img> directo; next/image solo se usa para el logo propio. Con un comodín
  // ("**") el optimizador /_next/image bajaba y reprocesaba imágenes de CUALQUIER sitio (proxy abierto que además gasta
  // la cuota gratis de Vercel). Solo se permite el Storage de Supabase de este proyecto.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gjqspmhrnqwavristrpv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
