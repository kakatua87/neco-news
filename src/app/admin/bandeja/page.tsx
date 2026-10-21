import { requireAdmin } from "../_lib/guard";
import { getEnviosAdmin, getRawCount, getScraperConfig } from "../_lib/data";
import { getRawGrupos } from "@/lib/noticias";
import BandejaTab from "./BandejaTab";

export default async function BandejaPage({
  searchParams,
}: {
  searchParams: Promise<{ origen?: string }>;
}) {
  // Verificación de admin en paralelo con las consultas que van por RLS. Las que usan el cliente
  // con service role esperan a que la verificación termine (no corren para quien no es admin).
  const guard = requireAdmin();
  const [, { origen }, rawGrupos, scraperConfig, rawTotal, envios] = await Promise.all([
    guard,
    searchParams,
    getRawGrupos(150),
    guard.then(() => getScraperConfig()),
    getRawCount(),
    guard.then(() => getEnviosAdmin()),
  ]);
  const origenInicial = origen === "scraper" || origen === "ciudadano" ? origen : "todos";

  const rawMostradas = Object.values(rawGrupos).reduce((n, notas) => n + notas.length, 0);
  return (
    <BandejaTab
      initialRawGrupos={rawGrupos}
      scraperConfig={scraperConfig}
      notasMostradas={rawMostradas}
      notasTotal={rawTotal}
      initialEnvios={envios}
      origenInicial={origenInicial}
    />
  );
}
