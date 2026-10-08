-- ============================================================================
-- Referencia del esquema REAL de Supabase (proyecto "Necochea Now").
-- Extraído en modo lectura el 2026-10-05. Sirve para reconstruir o auditar la base:
-- las migraciones de neco-news-scraper/migrations (v2-v9) solo cubren columnas nuevas y
-- algunas tablas; no incluían las tablas base, is_admin(), el trigger de portada ni las
-- políticas de abajo.
--
-- Para tener una migración ejecutable completa, correr con el CLI de Supabase:
--   supabase link --project-ref gjqspmhrnqwavristrpv
--   supabase db pull
-- ============================================================================

-- ─── Tablas (todas con RLS activado) ─────────────────────────────────────────
-- noticias            id uuid PK, estado text ('raw'|'pendiente'|'publicada'|'descartada'),
--                     titulo, cuerpo, resumen_seo, seccion, fuente, url_original (unique),
--                     imagen_url, imagen_fuente, instagram_titulo, instagram_text,
--                     instagram_descartado bool, twitter_text, guion_video, slug (unique),
--                     origen text ('scraper'|'redaccion'), fecha_publicacion, created_at,
--                     es_portada bool, orden_portada int, grupo_id uuid, titulo_original,
--                     fuentes_urls jsonb, instagram_publicado_at / instagram_post_id / instagram_permalink y
--                     facebook_publicado_at / facebook_post_id / facebook_permalink (marca de "ya publicada" en redes)
-- admins              user_id uuid PK -> auth.users
-- scraper_config      fila única (id = 1): activo, fuentes_activas text[], fecha_inicio,
--                     fuentes_custom jsonb [{key,label,url}], updated_at
-- envios_ciudadanos   nombre, telefono, categoria, mensaje, archivos jsonb, borrador jsonb,
--                     noticia_id -> noticias, estado ('nuevo'|'en_revision'|'procesada'|'descartada'),
--                     origen, created_at, updated_at
-- borradores_redaccion titulo, contenido_html, imagen_portada_url, seccion, autor_email,
--                     noticia_id -> noticias, estado ('borrador'|'procesado'), created_at, updated_at
-- banners             zona, nombre, imagen_url, url_destino, codigo_html, activo,
--                     fecha_inicio, fecha_fin, created_at
-- suscriptores        email (unique), activo, created_at
-- seccion_redirects   anterior (PK, minúsculas), nueva, created_at: al renombrar una sección el listado viejo
--                     redirige (301) al nuevo (las notas se redirigen solas por su página)
-- instagram_credenciales  una sola fila (id = 1): access_token, ig_user_id, expira_en, actualizado_en;
--                     el cron diario /api/instagram/renovar extiende el token
-- rate_limit_envios   ip_hash, accion, created_at: límite por visitante del formulario público
--
-- Storage: buckets noticias-imagenes y tips-ciudadanos (público).

-- ─── Autorización ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$function$;

-- ─── Carrusel de portada ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.actualizar_carrusel_portada()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  candidata RECORD;
  contador INT := 0;
  hoy_inicio timestamptz;
  hoy_fin timestamptz;
BEGIN
  hoy_inicio := date_trunc('day', now() AT TIME ZONE 'America/Argentina/Buenos_Aires') AT TIME ZONE 'America/Argentina/Buenos_Aires';
  hoy_fin := hoy_inicio + interval '1 day';

  UPDATE noticias
  SET es_portada = false, orden_portada = null
  WHERE es_portada = true;

  FOR candidata IN (
    SELECT id, seccion, fecha_publicacion
    FROM (
      SELECT DISTINCT ON (seccion) id, seccion, fecha_publicacion
      FROM noticias
      WHERE estado = 'publicada'
        AND seccion NOT IN ('Obituarios', 'Farmacias')
        AND fecha_publicacion >= hoy_inicio
        AND fecha_publicacion < hoy_fin
      ORDER BY seccion, fecha_publicacion DESC
    ) por_seccion
    ORDER BY fecha_publicacion DESC
    LIMIT 3
  )
  LOOP
    contador := contador + 1;
    UPDATE noticias
    SET es_portada = true, orden_portada = contador
    WHERE id = candidata.id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_actualizar_carrusel_portada()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estado = 'publicada' AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN
    PERFORM public.actualizar_carrusel_portada();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER noticias_publicada_actualiza_carrusel
  AFTER INSERT OR UPDATE OF estado ON public.noticias
  FOR EACH ROW EXECUTE FUNCTION trigger_actualizar_carrusel_portada();

-- ─── Políticas RLS ───────────────────────────────────────────────────────────
-- noticias
CREATE POLICY admin_full_access ON public.noticias FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY anon_select_publicadas ON public.noticias FOR SELECT TO anon
  USING (estado = 'publicada');
-- banners
CREATE POLICY "Banners públicos visibles" ON public.banners FOR SELECT TO anon, authenticated
  USING (activo = true);
CREATE POLICY admin_full_access ON public.banners FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
-- scraper_config
CREATE POLICY admin_full_access ON public.scraper_config FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
-- envíos ciudadanos: SIN política para anon. El formulario inserta siempre por /api/tips (service role).
--   (las políticas de INSERT anónimo se eliminaron el 2026-10-08, ver migraciones/2026-10-08_seguridad_envios.sql)
-- seccion_redirects: lectura pública (solo nombres de secciones); escribe únicamente la service role
CREATE POLICY "Redirecciones de sección públicas" ON public.seccion_redirects FOR SELECT TO anon, authenticated
  USING (true);
-- storage.objects (bucket tips-ciudadanos: solo lectura pública; las subidas van por /api/tips/subir-archivo)
CREATE POLICY tips_ciudadanos_lectura_publica ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'tips-ciudadanos');

-- Bucket tips-ciudadanos: file_size_limit = 60 MB y allowed_mime_types = imágenes, PDF, video y audio (13 tipos).
-- rate_limit_envios (ip_hash, accion, created_at): límite por visitante del formulario público; la IP se guarda
--   hasheada con sal, nunca en claro. RLS activo y sin políticas: solo la service role.

-- admins, borradores_redaccion, suscriptores, rate_limit_envios e instagram_credenciales no tienen políticas: solo se accede con la
-- service role desde las rutas /api (correcto, pero cualquier ruta nueva debe llamar a esAdmin()).
