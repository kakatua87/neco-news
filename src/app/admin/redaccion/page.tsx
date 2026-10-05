import { requireAdmin } from "../_lib/guard";
import RedaccionPanel from "../RedaccionPanel";

export default async function RedaccionPage() {
  await requireAdmin();
  return <RedaccionPanel />;
}
