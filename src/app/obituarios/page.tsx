import { Metadata } from "next";
import Link from "next/link";
import * as cheerio from "cheerio";

export const metadata: Metadata = {
  title: "Obituarios | Neco Now",
  description: "Avisos fúnebres y obituarios de Necochea, agrupados por mes.",
};

export const revalidate = 14400; // 4 horas

interface Obituario {
  title: string;
  href: string;
  slug: string;
  date: string; // "dd de mes de yyyy"
  month: number;
  monthName: string;
  year: number;
}

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4,
  mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const MESES_NOMBRES: Record<number, string> = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
  5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
  9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
};

function parseDateFromTitle(title: string): { month: number; year: number; date: string } | null {
  // "Avisos fúnebres del día 4 de mayo de 2026"
  const match = title.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase();
  const year = parseInt(match[3]);
  const month = MESES[monthStr];
  if (!month) return null;
  return {
    month,
    year,
    date: `${day} de ${match[2]} de ${year}`,
  };
}

async function fetchAllObituarios2026(): Promise<Obituario[]> {
  const allObs: Obituario[] = [];
  const seen = new Set<string>();
  const headers = { "User-Agent": "Mozilla/5.0 (compatible; NecoNow/1.0)" };

  // Recorrer hasta 20 páginas
  for (let page = 1; page <= 20; page++) {
    const url = page === 1
      ? "https://tsnnecochea.com.ar/tag/brandsafety/"
      : `https://tsnnecochea.com.ar/tag/brandsafety/page/${page}/`;

    try {
      const res = await fetch(url, {
        headers,
        next: { revalidate: 14400 },
      });
      if (!res.ok) break; // no hay más páginas

      const html = await res.text();
      const $ = cheerio.load(html);

      let foundAny = false;
      $("a.cover-link, a[href*='funebres']").each((_i, el) => {
        const href = $(el).attr("href") || "";
        const linkTitle = $(el).attr("title") || $(el).text().trim();

        if (!href.includes("funebre") || seen.has(href)) return;
        seen.add(href);
        foundAny = true;

        const parsed = parseDateFromTitle(linkTitle);
        if (!parsed || parsed.year !== 2026) return;

        const parts = href.split("/").filter(Boolean);
        const slug = parts[parts.length - 1];

        allObs.push({
          title: linkTitle,
          href,
          slug,
          date: parsed.date,
          month: parsed.month,
          monthName: MESES_NOMBRES[parsed.month],
          year: parsed.year,
        });
      });

      if (!foundAny) break; // página vacía
    } catch {
      break;
    }
  }

  // Ordenar por mes descendente, luego por fecha dentro del mes
  allObs.sort((a, b) => b.month - a.month || b.date.localeCompare(a.date));
  return allObs;
}

export default async function ObituariosPage() {
  const obituarios = await fetchAllObituarios2026();

  // Agrupar por mes
  const porMes = new Map<number, Obituario[]>();
  for (const ob of obituarios) {
    if (!porMes.has(ob.month)) porMes.set(ob.month, []);
    porMes.get(ob.month)!.push(ob);
  }

  // Meses ordenados de mayor a menor
  const mesesOrdenados = Array.from(porMes.keys()).sort((a, b) => b - a);

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-8 py-10 md:py-16">
      <div className="mb-12 text-center">
        <h1 className="font-editorial text-4xl md:text-5xl font-bold mb-4 text-charcoal">
          Obituarios
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Avisos fúnebres de Necochea y Quequén — 2026. <br />
          Actualizados diariamente.
        </p>
      </div>

      {mesesOrdenados.length > 0 ? (
        <div className="space-y-12">
          {mesesOrdenados.map((mes) => {
            const items = porMes.get(mes)!;
            const mesNombre = MESES_NOMBRES[mes];

            return (
              <section key={mes}>
                {/* Cabecera del mes */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-charcoal text-white px-5 py-2 rounded-lg">
                    <h2 className="text-lg font-bold uppercase tracking-wider">
                      {mesNombre} 2026
                    </h2>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted font-medium">
                    {items.length} {items.length === 1 ? "aviso" : "avisos"}
                  </span>
                </div>

                {/* Grid de avisos del mes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {items.map((ob, idx) => (
                    <Link
                      key={idx}
                      href={`/obituarios/${ob.slug}`}
                      className="group block bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 card-lift"
                    >
                      <div className="p-5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">
                          {ob.date}
                        </p>
                        <h3 className="font-bold text-base text-charcoal leading-snug group-hover:text-accent transition-colors">
                          Avisos fúnebres
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 border border-border rounded-xl p-10 text-center">
          <p className="text-muted">No se encontraron obituarios de 2026.</p>
        </div>
      )}
    </main>
  );
}
