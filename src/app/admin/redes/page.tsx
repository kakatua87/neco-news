import { requireAdmin } from "../_lib/guard";
import { getInstagramKit } from "@/lib/noticias";
import { corregirNombres } from "@/lib/correccion-nombres";
import RedesTab from "./RedesTab";
import type { InstagramKitItem } from "../_lib/types";

export default async function RedesPage() {
  const [, items] = await Promise.all([requireAdmin(), getInstagramKit(100)]);
  // Se muestra ya corregido (p. ej. "Necotchea") lo mismo que después se publica.
  const corregidos = (items as InstagramKitItem[]).map((n) => ({
    ...n,
    instagram_titulo: n.instagram_titulo ? corregirNombres(n.instagram_titulo) : n.instagram_titulo,
    instagram_text: n.instagram_text ? corregirNombres(n.instagram_text) : n.instagram_text,
  }));
  return <RedesTab initialItems={corregidos} />;
}
