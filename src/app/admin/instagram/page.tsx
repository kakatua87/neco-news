import { requireAdmin } from "../_lib/guard";
import { getInstagramKit } from "@/lib/noticias";
import InstagramTab from "./InstagramTab";
import type { InstagramKitItem } from "../_lib/types";

export default async function InstagramPage() {
  await requireAdmin();
  const items = (await getInstagramKit(100)) as InstagramKitItem[];
  return <InstagramTab initialItems={items} />;
}
