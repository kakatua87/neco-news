import dns from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 5;

/** true si la IP (v4 o v6) es privada, loopback, link-local o de metadata de nube. */
function esIpPrivada(ip: string): boolean {
  const tipo = net.isIP(ip);
  if (tipo === 4) {
    const partes = ip.split(".").map(Number);
    const [a, b] = partes;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (incluye metadata cloud)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 192 && b === 0 && partes[2] === 0) return true; // 192.0.0.0/24
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a >= 224) return true; // multicast + reservado (224.0.0.0/4 en adelante)
    return false;
  }
  if (tipo === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true; // link-local fe80::/10
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // unique local fc00::/7
    // IPv4 mapeada (::ffff:a.b.c.d) — validar la IPv4 embebida
    const mapeada = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeada) return esIpPrivada(mapeada[1]);
    return false;
  }
  return true; // no es una IP reconocible -> rechazar por las dudas
}

async function resuelveAIpPublica(hostname: string): Promise<boolean> {
  // Si ya es una IP literal, chequeamos directo (sin DNS).
  if (net.isIP(hostname)) {
    return !esIpPrivada(hostname);
  }
  let direcciones: { address: string }[];
  try {
    direcciones = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false;
  }
  if (direcciones.length === 0) return false;
  return direcciones.every((d) => !esIpPrivada(d.address));
}

/**
 * fetch() con protección SSRF básica: resuelve el hostname por DNS y rechaza
 * IPs privadas/loopback/link-local/metadata de nube (ej. 169.254.169.254)
 * antes de conectar, y sigue redirects a mano validando cada salto (fetch()
 * normal los sigue automáticamente, lo que permite bypassear un chequeo hecho
 * solo sobre la URL inicial).
 *
 * Limitación conocida: no fija la IP validada para la conexión real, así que
 * un DNS rebinding (el mismo hostname resolviendo distinto entre el chequeo y
 * el connect real, milisegundos después) no queda cubierto. Cubre el caso
 * realista: bloquear red interna, localhost y metadata de nube.
 */
export async function fetchExternoSeguro(
  urlInicial: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  let target = urlInicial;
  const { timeoutMs = 10000, ...fetchInit } = init ?? {};

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Protocolo no permitido");
    }
    if (!(await resuelveAIpPublica(parsed.hostname))) {
      throw new Error("Destino no permitido (red interna o privada)");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(parsed.toString(), { ...fetchInit, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect sin location");
      target = new URL(location, parsed).toString();
      continue;
    }

    return res;
  }
  throw new Error("Demasiados redirects");
}
