import { requireAdmin } from "../_lib/guard";
import { getDescartadasAdmin, getStats } from "../_lib/data";
import DescartadasTab from "./DescartadasTab";

export default async function DescartadasPage() {
  await requireAdmin();
  const [items, stats] = await Promise.all([getDescartadasAdmin(100), getStats()]);
  return <DescartadasTab initialItems={items} total={stats.descartadas} />;
}
