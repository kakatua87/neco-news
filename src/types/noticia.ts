export type EstadoNoticia = "raw" | "pendiente" | "publicada" | "descartada";

export type FuenteUrl = {
  fuente: string;
  url: string;
};

export type Noticia = {
  id: string | number;
  titulo: string;
  cuerpo: string;
  resumen_seo: string | null;
  seccion: string;
  estado: EstadoNoticia;
  url_original: string | null;
  imagen_url: string | null;
  instagram_text: string | null;
  instagram_titulo: string | null;
  twitter_text: string | null;
  guion_video: string | null;
  slug: string;
  fecha_publicacion: string | null;
  created_at: string;
  es_portada: boolean;
  orden_portada?: number | null;
  grupo_id?: string | null;
  titulo_original?: string | null;
  fuente?: string | null;
  imagen_fuente?: string | null;
  instagram_descartado?: boolean;
  instagram_publicado_at?: string | null;
  instagram_post_id?: string | null;
  instagram_permalink?: string | null;
  facebook_publicado_at?: string | null;
  facebook_post_id?: string | null;
  facebook_permalink?: string | null;
  fuentes_urls?: FuenteUrl[] | null;
  origen?: string;
};
