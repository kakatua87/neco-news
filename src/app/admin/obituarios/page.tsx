import { requireAdmin } from "../_lib/guard";
import { getObituariosAdmin } from "../_lib/data";
import ObituariosTab from "./ObituariosTab";

export default async function ObituariosPage() {
  const [, items] = await Promise.all([requireAdmin(), getObituariosAdmin()]);
  return <ObituariosTab initialItems={items} />;
}
