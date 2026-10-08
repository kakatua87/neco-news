import { createHash } from "node:crypto";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

/** IP del visitante. En Vercel `x-forwarded-for` lo fija la plataforma (el cliente no puede falsearlo). */
export function ipDe(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconocida";
}

/** Solo se guarda un hash con sal: no queda ninguna IP en la base. */
export function hashIp(ip: string): string {
  const sal = process.env.RATE_LIMIT_SALT || process.env.INTERNAL_API_SECRET || "neco-news";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * true si esta IP ya hizo `max` veces `accion` en los últimos `ventanaMinutos`; si no, registra el intento.
 * Falla "abierto": si la tabla no existe o la base falla, NO bloquea a nadie (solo registra el error), para
 * que un problema del limitador no deje a los vecinos sin poder mandar información.
 */
export async function superaLimite(
  supabase: SupabaseAdmin,
  request: Request,
  accion: string,
  max: number,
  ventanaMinutos = 60
): Promise<boolean> {
  try {
    const ipHash = hashIp(ipDe(request));
    const desde = new Date(Date.now() - ventanaMinutos * 60_000).toISOString();
    const { count, error } = await supabase
      .from("rate_limit_envios")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("accion", accion)
      .gte("created_at", desde);

    if (error) {
      console.error("rate-limit: no se pudo consultar (se deja pasar):", error.message);
      return false;
    }
    if ((count ?? 0) >= max) return true;

    await supabase.from("rate_limit_envios").insert({ ip_hash: ipHash, accion });
    // Limpieza oportunista de registros viejos (2% de las veces) para que la tabla no crezca sin fin.
    if (Math.random() < 0.02) {
      await supabase
        .from("rate_limit_envios")
        .delete()
        .lt("created_at", new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString());
    }
    return false;
  } catch (err) {
    console.error("rate-limit: error inesperado (se deja pasar):", err);
    return false;
  }
}
