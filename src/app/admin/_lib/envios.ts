export type ArchivoEnvio = { url: string; tipo: string; nombre: string };

export type BorradorEnvio = {
  titulo: string;
  cuerpo: string;
  resumen_seo?: string;
  seccion_sugerida?: string;
  instagram_text?: string;
  instagram_titulo?: string;
  twitter_text?: string;
  guion_video?: string;
  slug: string;
};

export type EstadoEnvio = "nuevo" | "en_revision" | "procesada" | "descartada";

export type Envio = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  categoria: string;
  mensaje: string;
  archivos: ArchivoEnvio[];
  estado: EstadoEnvio;
  borrador: BorradorEnvio | null;
  noticia_id: string | null;
  created_at: string;
};

/** Estados que siguen esperando trabajo de la redacción. */
export const ESTADOS_ACTIVOS: EstadoEnvio[] = ["nuevo", "en_revision"];
