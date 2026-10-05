import { requireAdmin } from "../_lib/guard";
import { getEnviosAdmin, getRawCount, getScraperConfig, getSecciones } from "../_lib/data";
import { getRawGrupos } from "@/lib/noticias";
import BandejaTab from "./BandejaTab";

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<{ origen?: string }>;
}) {
  await requireAdmin();
  const { origen } = await searchParams;
  const origenInicial = origen === "scraper" || origen === "ciudadano" ? origen : "todos";

  const [rawGrupos, scraperConfig, { disponibles }, rawTotal, envios] = await Promise.all([
    getRawGrupos(150),
    getScraperConfig(),
    getSecciones(),
    getRawCount(),
    getEnviosAdmin(),
  ]);
  const rawMostradas = Object.values(rawGrupos).reduce((n, notas) => n + notas.length, 0);
  return (
    <BandejaTab
      initialRawGrupos={rawGrupos}
      scraperConfig={scraperConfig}
      secciones={disponibles}
      notasMostradas={rawMostradas}
      notasTotal={rawTotal}
      initialEnvios={envios}
      origenInicial={origenInicial}
    />
  );
}
