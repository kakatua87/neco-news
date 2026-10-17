import { requireAdmin } from "../_lib/guard";
import { getSecciones, getStats } from "../_lib/data";
import { getPendientes } from "@/lib/noticias";
import PendientesTab from "./PendientesTab";

export default async function PendientesPage() {
  // La verificación de admin corre en paralelo con las consultas: si falla redirige y el resultado
  // de las consultas se descarta (todas pasan por RLS o por el cliente admin del lado servidor).
  const [, pendientes, { disponibles }, stats] = await Promise.all([
    requireAdmin(),
    getPendientes(80),
    getSecciones(),
    getStats(),
  ]);

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
    auto_motivo: n.auto_motivo,
    imagenes_fuentes: n.imagenes_fuentes,
  }));

  return <PendientesTab initialItems={items} secciones={disponibles} total={stats.pendientes} />;
}
