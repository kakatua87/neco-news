-- ============================================================================
-- Conexión con la Página de Facebook: guarda el token de la Página donde publica el panel.
--
-- Es aditiva: solo crea una tabla nueva. Una única fila (id = 1). Sin políticas de RLS: solo la service role
-- (las rutas /api/facebook/*) puede leerla o escribirla. Para revertir, ver el bloque "REVERTIR" al final.
-- ============================================================================

create table if not exists public.facebook_credenciales (
  id             int         primary key default 1 check (id = 1),
  page_id        text        not null,
  page_name      text,
  access_token   text        not null,
  actualizado_en timestamptz not null default now()
);
alter table public.facebook_credenciales enable row level security;

-- ─── REVERTIR ────────────────────────────────────────────────────────────────
-- drop table if exists public.facebook_credenciales;
