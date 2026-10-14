-- Oculta al público los datos de origen de las notas (url_original, fuente, fuentes_urls,
-- imagen_fuente, titulo_original, grupo_id, ids de redes, etc.).
--
-- Antes: la política anon_select_publicadas dejaba leer TODAS las columnas de las notas
-- publicadas con la clave anónima (que es pública). Ahora el rol `anon` solo puede leer las
-- columnas de la lista blanca; el admin (authenticated + is_admin()) y el scraper
-- (service_role) no cambian.
--
-- La lista debe coincidir con COLUMNAS_PUBLICAS en src/types/noticia.ts.
-- ORDEN DE DESPLIEGUE: primero el código que usa SELECT_PUBLICO (ya no hace select("*")),
-- después esta migración. Si se aplica antes, la portada falla con "permission denied".
--
-- Las columnas nuevas que se agreguen a `noticias` quedan ocultas para anon por defecto:
-- hay que sumarlas acá y en COLUMNAS_PUBLICAS si tienen que ser públicas.

revoke select on public.noticias from anon;

grant select (
  id, titulo, cuerpo, resumen_seo, seccion, slug, imagen_url,
  fecha_publicacion, created_at, es_portada, orden_portada, estado,
  instagram_text, twitter_text
) on public.noticias to anon;
