-- Páginas de sección y "Cargar más": ordenan por fecha_publicacion DESC (NULLS FIRST por defecto en Postgres).
-- El índice anterior usa NULLS LAST y no servía para este orden.
create index if not exists noticias_publicadas_fecha_idx
  on public.noticias (fecha_publicacion desc)
  where estado = 'publicada';
