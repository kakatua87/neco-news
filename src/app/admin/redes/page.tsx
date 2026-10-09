import { requireAdmin } from "../_lib/guard";
import { getInstagramKit } from "@/lib/noticias";
import RedesTab from "./RedesTab";
import type { InstagramKitItem } from "../_lib/types";

export default async function RedesPage() {
  await requireAdmin();
  const items = (await getInstagramKit(100)) as InstagramKitItem[];
  return <RedesTab initialItems={items} />;
}
