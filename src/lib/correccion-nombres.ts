/**
 * Corrige errores de tipeo en los nombres propios que más se repiten en el portal ("Necotchea" → "Necochea").
 * La IA que arma el copy de redes a veces los escribe mal; esto se aplica antes de guardar y al editar.
 * Solo toca palabras casi idénticas al nombre (distancia de edición baja), así que no pisa "Neco Beat" ni
 * palabras comunes.
 */
const NOMBRES: Array<{ correcto: string; maxDistancia: number }> = [
  { correcto: "Necochea", maxDistancia: 2 },
  { correcto: "Quequén", maxDistancia: 1 },
];

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Mark}/gu, "").toLowerCase();

function distancia(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Respeta el formato de lo escrito: MAYÚSCULAS, Capitalizada o minúscula. */
function conFormatoDe(original: string, correcto: string): string {
  if (original === original.toUpperCase()) return correcto.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return correcto;
  return correcto.toLowerCase();
}

export function corregirNombres(texto: string): string {
  return texto.replace(/\p{L}{6,10}/gu, (palabra) => {
    const base = sinTildes(palabra);
    for (const { correcto, maxDistancia } of NOMBRES) {
      const objetivo = sinTildes(correcto);
      if (base[0] !== objetivo[0] || Math.abs(base.length - objetivo.length) > maxDistancia) continue;
      if (distancia(base, objetivo) <= maxDistancia) return conFormatoDe(palabra, correcto);
    }
    return palabra;
  });
}
