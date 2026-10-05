import { requireAdmin } from "../_lib/guard";
import { getActividad, getInboxCount, getStats } from "../_lib/data";
import ResumenTab from "./ResumenTab";

export default async function ResumenPage() {
  await requireAdmin();
  const [stats, inboxCount, actividad] = await Promise.all([getStats(), getInboxCount(), getActividad()]);
  return <ResumenTab stats={stats} inboxCount={inboxCount} actividad={actividad} />;
}
