import { requireAdmin } from "../_lib/guard";
import { getPublicadasAdmin, getSecciones, getStats } from "../_lib/data";
import PublicadasTab from "./PublicadasTab";

export default async function PublicadasPage() {
  const [, items, { disponibles }, stats] = await Promise.all([
    requireAdmin(),
    getPublicadasAdmin(),
    getSecciones(),
    getStats(),
  ]);
  return <PublicadasTab initialItems={items} secciones={disponibles} total={stats.publicadas} />;
}
