export type EstadoNoticia = "pendiente" | "publicada" | "descartada";

export type Noticia = {
  id: number;
  titulo: string;
  cuerpo: string;
  resumen_seo: string | null;
  seccion: string;
  estado: EstadoNoticia;
  fuente: string | null;
  url_original: string | null;
  imagen_url: string | null;
  instagram_text: string | null;
  twitter_text: string | null;
  guion_video: string | null;
  slug: string;
  fecha_publicacion: string | null;
  created_at: string;
};
