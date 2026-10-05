import { requireAdmin } from "../_lib/guard";
import { getSecciones } from "../_lib/data";
import BannersPanel from "../BannersPanel";

export default async function BannersPage() {
  await requireAdmin();
  const { disponibles } = await getSecciones();
  return <BannersPanel secciones={disponibles} />;
}
