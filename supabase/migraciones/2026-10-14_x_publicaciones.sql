-- ============================================================================
-- Conexión con X (Twitter): tokens OAuth 2.0 de la cuenta donde publica el panel + marca de "ya publicada".
--
-- Es aditiva: una tabla nueva (una única fila, id = 1, sin políticas de RLS: solo la service role) y columnas
-- nuevas y nulas en noticias. Para revertir, ver el bloque "REVERTIR" al final.
-- ============================================================================

create table if not exists public.x_credenciales (
  id             int         primary key default 1 check (id = 1),
  access_token   text        not null,
  refresh_token  text,
  expira_en      timestamptz,
  user_id        text,
  username       text,
  actualizado_en timestamptz not null default now()
);
alter table public.x_credenciales enable row level security;

alter table public.noticias
  add column if not exists x_publicado_at timestamptz,
  add column if not exists x_post_id      text,
  add column if not exists x_permalink    text;

-- ─── REVERTIR ────────────────────────────────────────────────────────────────
-- drop table if exists public.x_credenciales;
-- alter table public.noticias drop column if exists x_publicado_at,
--   drop column if exists x_post_id, drop column if exists x_permalink;
