import { requireAdmin } from "../_lib/guard";
import { getDescartadasAdmin, getStats } from "../_lib/data";
import DescartadasTab from "./DescartadasTab";

export default async function DescartadasPage() {
  const [, items, stats] = await Promise.all([requireAdmin(), getDescartadasAdmin(100), getStats()]);
  return <DescartadasTab initialItems={items} total={stats.descartadas} />;
}
