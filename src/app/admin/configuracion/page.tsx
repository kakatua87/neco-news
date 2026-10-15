import { requireAdmin } from "../_lib/guard";
import { getScraperConfig, getSecciones } from "../_lib/data";
import ConfiguracionTab from "./ConfiguracionTab";

export default async function ConfiguracionPage() {
  // getScraperConfig usa el cliente admin: no se lanza hasta confirmar que es admin.
  const [, { disponibles, usadas }] = await Promise.all([requireAdmin(), getSecciones()]);
  const config = await getScraperConfig();
  return <ConfiguracionTab scraperConfig={config} seccionesUsadas={usadas} seccionesDisponibles={disponibles} />;
}
