import { requireAdmin } from "../_lib/guard";
import { getRawCount, getScraperConfig, getSecciones } from "../_lib/data";
import { getRawGrupos } from "@/lib/noticias";
import BandejaTab from "./BandejaTab";

export default async function BandejaPage() {
  await requireAdmin();
  const [rawGrupos, scraperConfig, { disponibles }, rawTotal] = await Promise.all([
    getRawGrupos(150),
    getScraperConfig(),
    getSecciones(),
    getRawCount(),
  ]);
  const rawMostradas = Object.values(rawGrupos).reduce((n, notas) => n + notas.length, 0);
  return (
    <BandejaTab
      initialRawGrupos={rawGrupos}
      scraperConfig={scraperConfig}
      secciones={disponibles}
      notasMostradas={rawMostradas}
      notasTotal={rawTotal}
    />
  );
}
