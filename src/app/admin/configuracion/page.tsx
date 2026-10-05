import { requireAdmin } from "../_lib/guard";
import { getScraperConfig, getSecciones } from "../_lib/data";
import ConfiguracionTab from "./ConfiguracionTab";

export default async function ConfiguracionPage() {
  await requireAdmin();
  const [config, { disponibles, usadas }] = await Promise.all([getScraperConfig(), getSecciones()]);
  return <ConfiguracionTab scraperConfig={config} seccionesUsadas={usadas} seccionesDisponibles={disponibles} />;
}
