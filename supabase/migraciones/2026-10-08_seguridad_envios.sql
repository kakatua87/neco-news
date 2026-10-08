-- ============================================================================
-- Seguridad del formulario público de envíos ciudadanos (grupo C del plan).
--
-- Contexto: el formulario SIEMPRE pasa por las rutas /api/tips y /api/tips/subir-archivo, que usan la
-- service role (se saltean RLS). Pero estas dos políticas permitían a CUALQUIERA insertar directo en
-- Supabase con la clave anónima (que es pública en el navegador), salteando las validaciones, el tope por
-- hora y el límite por IP de la API.
--
-- Es segura de aplicar: nada del sitio inserta con el rol anon.
-- Para revertir, ver el bloque "REVERTIR" al final.
-- ============================================================================

-- 1) Se cierra la inserción directa con la clave pública
drop policy if exists envios_ciudadanos_insert_publico on public.envios_ciudadanos;
drop policy if exists tips_ciudadanos_insert_publico on storage.objects;

-- 2) Límites a nivel de bucket (defensa en profundidad: valen aunque alguien llegue a Storage por otro camino)
update storage.buckets
set file_size_limit = 62914560,  -- 60 MB, el tope más alto que acepta la API (video)
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'video/mp4', 'video/quicktime', 'video/webm',
      'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav'
    ]
where id = 'tips-ciudadanos';

-- 3) Límite por visitante: solo se guarda un hash con sal de la IP, nunca la IP.
--    Sin políticas: solo la service role (las rutas /api) puede leer y escribir.
create table if not exists public.rate_limit_envios (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  accion     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_envios_busqueda
  on public.rate_limit_envios (ip_hash, accion, created_at desc);
alter table public.rate_limit_envios enable row level security;

-- ─── REVERTIR ────────────────────────────────────────────────────────────────
-- create policy envios_ciudadanos_insert_publico on public.envios_ciudadanos for insert to anon with check (true);
-- create policy tips_ciudadanos_insert_publico on storage.objects for insert to anon with check (bucket_id = 'tips-ciudadanos');
-- update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'tips-ciudadanos';
-- drop table if exists public.rate_limit_envios;
