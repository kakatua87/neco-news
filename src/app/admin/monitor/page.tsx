import { requireAdmin } from "../_lib/guard";
import { getMonitorScraping } from "../_lib/monitor";
import MonitorTab from "./MonitorTab";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  await requireAdmin();
  const datos = await getMonitorScraping();
  return <MonitorTab datos={datos} />;
}
