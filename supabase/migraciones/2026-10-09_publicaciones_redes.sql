-- ============================================================================
-- Marca de "ya publicada" en redes: el panel recuerda qué notas salieron en Instagram y en Facebook.
--
-- Es aditiva: solo agrega columnas nuevas y nulas a noticias, no toca datos existentes ni políticas.
-- Para revertir, ver el bloque "REVERTIR" al final.
-- ============================================================================

alter table public.noticias
  add column if not exists instagram_publicado_at timestamptz,
  add column if not exists instagram_post_id      text,
  add column if not exists instagram_permalink    text,
  add column if not exists facebook_publicado_at  timestamptz,
  add column if not exists facebook_post_id       text,
  add column if not exists facebook_permalink     text;

-- ─── REVERTIR ────────────────────────────────────────────────────────────────
-- alter table public.noticias
--   drop column if exists instagram_publicado_at, drop column if exists instagram_post_id,
--   drop column if exists instagram_permalink, drop column if exists facebook_publicado_at,
--   drop column if exists facebook_post_id, drop column if exists facebook_permalink;
