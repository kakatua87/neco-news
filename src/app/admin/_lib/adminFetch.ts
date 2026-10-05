export type AdminFetchResult<T> = { ok: boolean; status: number; data: T | null; error: string | null };

/**
 * fetch a las rutas /api del panel con manejo de errores uniforme: nunca lanza,
 * siempre devuelve { ok, data, error } para poder avisar al usuario.
 * Con `json` serializa el cuerpo y pone el Content-Type.
 */
export async function adminFetch<T = Record<string, unknown>>(
  url: string,
  init: Omit<RequestInit, "body"> & { json?: unknown } = {}
): Promise<AdminFetchResult<T>> {
  const { json, headers, ...resto } = init;
  try {
    const res = await fetch(url, {
      ...resto,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
    let data: (T & { ok?: boolean; error?: string }) | null = null;
    try {
      data = await res.json();
    } catch {
      // respuesta sin cuerpo JSON
    }
    const ok = res.ok && data?.ok !== false;
    return { ok, status: res.status, data, error: ok ? null : data?.error || `Error ${res.status}` };
  } catch {
    return { ok: false, status: 0, data: null, error: "Error de conexión" };
  }
}
