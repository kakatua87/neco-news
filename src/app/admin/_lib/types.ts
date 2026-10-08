import type { Noticia, FuenteUrl } from "@/types/noticia";

/** Noticia tal como la edita el panel (pendientes y publicadas). */
export type Editable = Pick<
  Noticia,
  "id" | "titulo" | "cuerpo" | "seccion" | "imagen_url" | "created_at" | "origen"
> & {
  slug?: string;
  tiene_perspectiva_editorial?: boolean;
  es_portada?: boolean;
  orden_portada?: number | null;
  fecha_publicacion?: string;
  url_original?: string | null;
  fuentes_urls?: FuenteUrl[] | null;
};

export type InstagramKitItem = Pick<
  Noticia,
  "id" | "titulo" | "instagram_titulo" | "instagram_text" | "imagen_url" | "seccion" | "slug" | "fecha_publicacion"
> &
  Pick<
    Noticia,
    | "instagram_publicado_at"
    | "instagram_permalink"
    | "facebook_publicado_at"
    | "facebook_permalink"
  >;
