import { requireAdmin } from "../_lib/guard";
import { getObituariosAdmin } from "../_lib/data";
import ObituariosTab from "./ObituariosTab";

export default async function ObituariosPage() {
  await requireAdmin();
  return <ObituariosTab initialItems={await getObituariosAdmin()} />;
}
