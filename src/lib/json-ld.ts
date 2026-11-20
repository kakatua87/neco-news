/**
 * Serializa datos estructurados (JSON-LD) para meterlos en un <script type="application/ld+json">.
 * JSON.stringify no escapa "<": un titulo con "</script><script>..." cerraria la etiqueta e inyectaria codigo.
 * Se escapan <, > y & (y los separadores de linea U+2028/U+2029) como secuencias \\uXXXX, que el JSON sigue leyendo igual.
 */
const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [String.fromCharCode(0x2028)]: "\\u2028",
  [String.fromCharCode(0x2029)]: "\\u2029",
};

export function jsonLdSeguro(datos: unknown): string {
  return JSON.stringify(datos).replace(new RegExp("[<>&" + String.fromCharCode(0x2028, 0x2029) + "]", "g"), (c) => ESCAPES[c]);
}
