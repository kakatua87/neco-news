CREATE TABLE banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zona text NOT NULL,  -- 'header' | 'sidebar' | 'in-article' | 'footer'
  nombre text,         -- descripción interna
  imagen_url text,
  url_destino text,
  codigo_html text,    -- para AdSense u otros
  activo boolean DEFAULT true,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  created_at timestamptz DEFAULT now()
);
