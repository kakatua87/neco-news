import { requireAdmin } from "../_lib/guard";
import { getActividad, getInboxCount, getStats } from "../_lib/data";
import ResumenTab from "./ResumenTab";

export default async function ResumenPage() {
  // getActividad usa el cliente con service role: espera a que termine la verificación de admin.
  const guard = requireAdmin();
  const [, stats, inboxCount, actividad] = await Promise.all([
    guard,
    getStats(),
    getInboxCount(),
    guard.then(() => getActividad()),
  ]);
  return <ResumenTab stats={stats} inboxCount={inboxCount} actividad={actividad} />;
}
