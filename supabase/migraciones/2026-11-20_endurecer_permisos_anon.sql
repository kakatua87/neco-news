-- Defensa en profundidad: hoy RLS impide que `anon` escriba, pero los GRANT lo permitían. Si algún día se desactiva RLS
-- o se agrega una política permisiva por error, `anon` podría modificar o borrar datos. El sitio público solo LEE
-- noticias publicadas (por columnas), banners activos y redirecciones de sección.
revoke insert, update, delete, truncate, references, trigger on table public.noticias from anon;
revoke insert, update, delete, truncate, references, trigger on table public.banners from anon;
revoke insert, update, delete, truncate, references, trigger on table public.seccion_redirects from anon;

-- Sin política para anon: el sitio público no las usa; el panel entra como `authenticated` (is_admin) o con la clave de servicio.
revoke all on table public.banner_stats from anon;
revoke all on table public.scraper_config from anon;

-- Función de trigger: no debe poder invocarse desde la API.
revoke execute on function public.noticias_fecha_publicacion_por_defecto() from public, anon, authenticated;

-- Bucket de envíos ciudadanos: la política dejaba a cualquiera LISTAR y leer todos los archivos (fotos, audios, PDFs).
-- Se cierra el listado. El bucket sigue siendo público (el panel usa getPublicUrl): pasarlo a privado con enlaces
-- firmados es un cambio de código pendiente.
drop policy if exists "tips_ciudadanos_lectura_publica" on storage.objects;
