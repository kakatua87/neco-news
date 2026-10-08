import { NextResponse } from "next/server";

/** Página HTML mínima con el resultado de un login OAuth (Instagram / Facebook): `cuerpoHtml` ya viene escapado. */
export function paginaOauth(titulo: string, cuerpoHtml: string, ok: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>${titulo}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; color: #111827; }
  h1 { font-size: 20px; }
  .ok { color: #1B8B7A; }
  .error { color: #dc2626; }
  code, .valor { display: block; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 8px 0 20px; }
  .label { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
</style>
</head>
<body>
  <h1 class="${ok ? "ok" : "error"}">${titulo}</h1>
  ${cuerpoHtml}
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
