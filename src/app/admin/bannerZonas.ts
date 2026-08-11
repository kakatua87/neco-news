export type ZonaInfo = {
  zona: string;
  label: string;
  ancho: number;
  alto: number;
};

// Catálogo de zonas con placement fijo en el sitio (posición + tamaño de banner
// recomendado). Las zonas por sección de noticias ("seccion-<nombre>") se arman
// dinámicamente con zonasPorSecciones() a partir de las secciones existentes.
export const ZONAS_FIJAS: ZonaInfo[] = [
  { zona: "portada", label: "Home — debajo del carrusel principal", ancho: 1200, alto: 100 },
  { zona: "header", label: "Home — debajo de portada + Top Stories", ancho: 1200, alto: 100 },
  { zona: "sidebar", label: "Home — junto al carrusel, sobre Top Stories", ancho: 500, alto: 125 },
  { zona: "in-article", label: "Dentro de una noticia, después del primer párrafo", ancho: 900, alto: 100 },
];

export function zonaSeccion(seccion: string): string {
  return `seccion-${seccion.toLowerCase()}`;
}

export function zonasPorSecciones(secciones: string[]): ZonaInfo[] {
  return secciones.map((s) => ({
    zona: zonaSeccion(s),
    label: `Sección "${s}" — arriba del listado`,
    ancho: 1200,
    alto: 100,
  }));
}

export function aspectRatio(z: Pick<ZonaInfo, "ancho" | "alto">): number {
  return z.ancho / z.alto;
}

export function tamanoLabel(z: Pick<ZonaInfo, "ancho" | "alto">): string {
  return `${z.ancho} × ${z.alto}px`;
}
