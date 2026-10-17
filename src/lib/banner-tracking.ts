const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|headless|lighthouse|curl|wget|python|axios|node-fetch/i;

export const esUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** true si el User-Agent parece un robot: sus visitas no cuentan como impresiones ni clics. */
export function esBot(request: Request): boolean {
  const ua = request.headers.get("user-agent");
  return !ua || BOTS.test(ua);
}
