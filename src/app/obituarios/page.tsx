import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Obituarios | Neco Now",
  description: "Avisos fúnebres de Necochea y Quequén, agrupados por mes.",
};

export const revalidate = 14400; // 4 horas

const MESES_NOMBRES: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

interface ObituarioMes {
  id: string;
  titulo: string;
  cuerpo: string;
  slug: string;
  mes: number;
  mesNombre: string;
  anio: number;
  cantidad: number;
}

export default async function ObituariosPage() {
  const obituariosPorMes: ObituarioMes[] = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Buscar todos los registros de obituarios agrupados por mes (slug: obituarios-2026-XX)
    const { data, error } = await supabase
      .from("noticias")
      .select("id, titulo, cuerpo, slug")
      .eq("seccion", "Obituarios")
      .like("slug", "obituarios-2026-%")
      .eq("estado", "publicada")
      .order("slug", { ascending: false });

    if (!error && data) {
      for (const row of data) {
        // Parse slug: "obituarios-2026-05" → mes=5, anio=2026
        const match = row.slug.match(/obituarios-(\d{4})-(\d{2})/);
        if (!match) continue;

        const anio = parseInt(match[1]);
        const mesNum = parseInt(match[2]);
        const mesKey = match[2];

        // Contar avisos: cada "###" en el cuerpo es un aviso
        const cantidad = (row.cuerpo?.match(/###/g) || []).length;

        obituariosPorMes.push({
          id: row.id,
          titulo: row.titulo,
          cuerpo: row.cuerpo || "",
          slug: row.slug,
          mes: mesNum,
          mesNombre: MESES_NOMBRES[mesKey] || `Mes ${mesNum}`,
          anio,
          cantidad,
        });
      }
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
          Avisos fúnebres de Necochea y Quequén — 2026. <br />
          Actualizados diariamente.
        </p>
      </div>

      {obituariosPorMes.length > 0 ? (
        <div className="space-y-6">
          {obituariosPorMes.map((grupo) => (
            <Link
              key={grupo.slug}
              href={`/obituarios/${grupo.slug}`}
              className="group block bg-white rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 card-lift"
            >
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-charcoal text-white px-4 py-2 rounded-lg">
                    <span className="text-lg font-bold uppercase tracking-wider">
                      {grupo.mesNombre}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-charcoal group-hover:text-accent transition-colors">
                      {grupo.titulo}
                    </h2>
                    <p className="text-sm text-muted">
                      {grupo.cantidad > 0
                        ? `${grupo.cantidad} ${grupo.cantidad === 1 ? "aviso" : "avisos"} fúnebres`
                        : "Avisos fúnebres del mes"}
                    </p>
                  </div>
                </div>
                <span className="text-accent text-2xl group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-border rounded-xl p-10 text-center">
          <p className="text-muted">No se encontraron obituarios de 2026.</p>
        </div>
      )}
    </main>
  );
}
