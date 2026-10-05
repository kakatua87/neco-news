import { requireAdmin } from "../_lib/guard";
import { getSecciones, getStats } from "../_lib/data";
import { getPendientes } from "@/lib/noticias";
import PendientesTab from "./PendientesTab";

export default async function PendientesPage() {
  await requireAdmin();
  const [pendientes, { disponibles }, stats] = await Promise.all([getPendientes(80), getSecciones(), getStats()]);

  const items = pendientes.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    seccion: n.seccion,
    imagen_url: n.imagen_url,
    created_at: n.created_at,
    url_original: n.url_original,
    fuentes_urls: n.fuentes_urls,
    origen: n.origen,
  }));

  return <PendientesTab initialItems={items} secciones={disponibles} total={stats.pendientes} />;
}
