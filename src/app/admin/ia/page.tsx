import { requireAdmin } from "../_lib/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { barrasDelDia, capacidadRestante, consumoPorNota, LIMITES_POR_DEFECTO, type FilaUso, type IaLimites } from "./calculos";
import IaTab from "./IaTab";

export const dynamic = "force-dynamic";

const DIAS_HISTORIAL = 8;
const PAGINA = 1000; // tope de filas por consulta de Supabase

async function leerUso(desdeISO: string): Promise<FilaUso[]> {
  const admin = createSupabaseAdminClient();
  const filas: FilaUso[] = [];
  for (let pagina = 0; pagina < 30; pagina++) {
    const { data, error } = await admin
      .from("llm_uso")
      .select("ts, proveedor, key_alias, modelo, proposito, noticia_id, tokens_in, tokens_out, ok, codigo, restante")
      .gte("ts", desdeISO)
      .order("ts", { ascending: false })
      .range(pagina * PAGINA, (pagina + 1) * PAGINA - 1);
    if (error) {
      console.error("Error leyendo llm_uso:", error.message);
      break;
    }
    filas.push(...((data ?? []) as FilaUso[]));
    if (!data || data.length < PAGINA) break;
  }
  return filas;
}

async function notasPublicadas(ids: string[]): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const publicadas = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("noticias").select("id").eq("estado", "publicada").in("id", ids.slice(i, i + 200));
    for (const n of data ?? []) publicadas.add(n.id as string);
  }
  return publicadas;
}

export default async function IaPage() {
  await requireAdmin();
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - DIAS_HISTORIAL * 24 * 3600 * 1000).toISOString();
  const admin = createSupabaseAdminClient();

  const [filas, cfg] = await Promise.all([
    leerUso(desde),
    admin.from("scraper_config").select("ia_limites").eq("id", 1).single(),
  ]);
  const limites: IaLimites = {
    modelos: (cfg.data?.ia_limites as IaLimites | null)?.modelos ?? LIMITES_POR_DEFECTO.modelos,
    keys: (cfg.data?.ia_limites as IaLimites | null)?.keys ?? LIMITES_POR_DEFECTO.keys,
  };

  const idsConNota = Array.from(new Set(filas.map((f) => f.noticia_id).filter((id): id is string => !!id)));
  const publicadas = await notasPublicadas(idsConNota);

  const barras = barrasDelDia(filas, limites, ahora);
  const consumo = consumoPorNota(filas, publicadas);
  const capacidad = capacidadRestante(barras, consumo);

  return (
    <IaTab
      ahoraISO={ahora.toISOString()}
      barras={barras}
      consumo={consumo}
      capacidad={capacidad}
      limites={limites}
      totalFilas={filas.length}
    />
  );
}
