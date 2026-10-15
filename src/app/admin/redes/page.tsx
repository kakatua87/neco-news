import { requireAdmin } from "../_lib/guard";
import { getInstagramKit } from "@/lib/noticias";
import RedesTab from "./RedesTab";
import type { InstagramKitItem } from "../_lib/types";

export default async function RedesPage() {
  const [, items] = await Promise.all([requireAdmin(), getInstagramKit(100)]);
  return <RedesTab initialItems={items as InstagramKitItem[]} />;
}
