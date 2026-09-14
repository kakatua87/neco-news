// Instagram no soporta negrita real en el texto del caption. Los perfiles de
// noticias suelen simularla mapeando letras/numeros ASCII a los caracteres
// Unicode "Mathematical Sans-Serif Bold" (U+1D5D4+), que Instagram renderiza
// como glifos en negrita. Tildes/enies y demas simbolos quedan sin mapear y
// se dejan tal cual (no tienen equivalente bold en ese bloque Unicode).
const MAYUSCULAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijklmnopqrstuvwxyz";
const DIGITOS = "0123456789";

function construirMapaNegrita(): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (let i = 0; i < MAYUSCULAS.length; i++) {
    mapa[MAYUSCULAS[i]] = String.fromCodePoint(0x1d5d4 + i);
  }
  for (let i = 0; i < MINUSCULAS.length; i++) {
    mapa[MINUSCULAS[i]] = String.fromCodePoint(0x1d5ee + i);
  }
  for (let i = 0; i < DIGITOS.length; i++) {
    mapa[DIGITOS[i]] = String.fromCodePoint(0x1d7ec + i);
  }
  return mapa;
}

const MAPA_NEGRITA = construirMapaNegrita();

export function textoEnNegrita(texto: string): string {
  return Array.from(texto)
    .map((caracter) => MAPA_NEGRITA[caracter] ?? caracter)
    .join("");
}
