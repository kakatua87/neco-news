-- ============================================================================
-- Mantenimiento (grupo D del plan): redirecciones de secciones y token de Instagram.
--
-- Es aditiva: solo crea tablas nuevas, no toca datos existentes. El código funciona aunque estas tablas
-- no existan todavía (cae al comportamiento anterior), así que se puede aplicar en cualquier momento.
-- Para revertir, ver el bloque "REVERTIR" al final.
-- ============================================================================

-- 1) Cuando se renombra una sección, el listado de la sección vieja redirige (301) a la nueva.
--    Las notas se redirigen solas por su página (se buscan por slug), no necesitan esta tabla.
create table if not exists public.seccion_redirects (
  anterior   text        primary key,   -- nombre anterior en minúsculas ("deportes")
  nueva      text        not null,      -- nombre actual en minúsculas ("deportes locales")
  created_at timestamptz not null default now()
);
alter table public.seccion_redirects enable row level security;
-- Lectura pública: son solo nombres de secciones y las usan las páginas públicas.
create policy "Redirecciones de sección públicas" on public.seccion_redirects
  for select to anon, authenticated using (true);
-- Sin políticas de escritura: solo la service role (la ruta de renombrar) puede modificarla.

-- 2) Token de Instagram: se guarda acá (y no en una variable de entorno) para poder renovarlo solo
--    y avisar cuando vence. Una única fila (id = 1). Sin políticas: solo la service role.
create table if not exists public.instagram_credenciales (
  id             int         primary key default 1 check (id = 1),
  access_token   text        not null,
  ig_user_id     text,
  expira_en      timestamptz,
  actualizado_en timestamptz not null default now()
);
alter table public.instagram_credenciales enable row level security;

-- ─── REVERTIR ────────────────────────────────────────────────────────────────
-- drop table if exists public.seccion_redirects;
-- drop table if exists public.instagram_credenciales;
