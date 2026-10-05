import { requireAdmin } from "../_lib/guard";
import EnviosPanel from "../EnviosPanel";

export default async function EnviosPage() {
  await requireAdmin();
  return <EnviosPanel />;
}
