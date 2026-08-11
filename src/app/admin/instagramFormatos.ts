export type FormatoKey = "cuadrado" | "vertical" | "historia";

export const FORMATOS: { key: FormatoKey; label: string; ancho: number; alto: number }[] = [
  { key: "cuadrado", label: "Feed cuadrado", ancho: 1080, alto: 1080 },
  { key: "vertical", label: "Feed vertical", ancho: 1080, alto: 1350 },
  { key: "historia", label: "Historia", ancho: 1080, alto: 1920 },
];

export function aspectRatioDe(formato: FormatoKey): number {
  const f = FORMATOS.find((x) => x.key === formato)!;
  return f.ancho / f.alto;
}
