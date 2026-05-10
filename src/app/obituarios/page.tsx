import { Metadata } from "next";
import Link from "next/link";
import * as cheerio from "cheerio";

export const metadata: Metadata = {
  title: "Obituarios | Neco Now",
  description: "Avisos fúnebres y obituarios del día en Necochea.",
};

export const revalidate = 14400; // 4 horas

interface Obituario {
  title: string;
  href: string;
}

export default async function ObituariosPage() {
  const obituarios: Obituario[] = [];

  try {
    const res = await fetch("https://tsnnecochea.com.ar/seccion/servicios/", {
      next: { revalidate: 14400 },
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      // Usar un Set para evitar duplicados
      const seen = new Set<string>();

      $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("funebre") && !seen.has(href)) {
          seen.add(href);
          
          // Extraer título del slug: "avisos-funebres-del-dia-4-de-mayo-de-2026-224731"
          const parts = href.split("/").filter(Boolean);
          const slug = parts[parts.length - 1]; // último segmento

          if (slug && slug.includes("avisos")) {
            // Reemplazar guiones por espacios y remover el ID numérico final
            let title = slug.replace(/-/g, " ").replace(/\s\d{5,}$/, "").trim();
            
            // Capitalizar y corregir acentos comunes
            title = title.charAt(0).toUpperCase() + title.slice(1);
            title = title.replace("funebres", "fúnebres").replace("dia", "día");
            
            obituarios.push({ title, href });
          }
        }
      });
    }
  } catch (error) {
    console.error("Error fetching obituarios:", error);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-16">
      <div className="mb-12 text-center">
        <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-4 text-charcoal">
          Obituarios
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Avisos fúnebres de Necochea y Quequén. <br />
          Actualizados diariamente.
        </p>
      </div>

      {obituarios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {obituarios.map((ob, idx) => (
            <a
              key={idx}
              href={ob.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 card-lift"
            >
              {/* Contenedor del ícono (Lazo negro) */}
              <div className="bg-gray-50 flex items-center justify-center py-12 border-b border-border">
                <svg
                  width="64"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-charcoal opacity-90 group-hover:scale-110 transition-transform duration-300"
                >
                  <path d="M12 21a9 9 0 0 1-5-1.5L6 19l1.5-1A9 9 0 1 1 12 21Z" fill="currentColor" />
                  {/* Esto es un SVG genérico, lo reemplazaré por un lazo real para que quede mejor */}
                  <path d="M12 4C9 4 7 7.5 7 10.5C7 15 15 20 15 20" />
                  <path d="M12 4C15 4 17 7.5 17 10.5C17 15 9 20 9 20" />
                </svg>
              </div>
              
              <div className="p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">
                  Avisos fúnebres
                </p>
                <h2 className="font-bold text-lg text-charcoal leading-tight group-hover:text-accent transition-colors">
                  {ob.title}
                </h2>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-border rounded-xl p-10 text-center">
          <p className="text-muted">No se pudieron cargar los obituarios en este momento.</p>
        </div>
      )}
    </main>
  );
}
