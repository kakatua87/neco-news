-- Portada: las consultas de listas (últimas publicadas y por sección) leían y ordenaban todas las notas
-- publicadas con el índice de `estado`. Estos índices parciales siguen el orden exacto de la consulta
-- (fecha_publicacion DESC NULLS LAST, created_at DESC) y se limitan a las publicadas, así el LIMIT corta rápido.
create index if not exists noticias_publicadas_orden_idx
  on public.noticias (fecha_publicacion desc nulls last, created_at desc)
  where estado = 'publicada';

-- Carrusel de portada: estado = publicada, es_portada = true, rango de fecha, orden por orden_portada.
create index if not exists noticias_portada_idx
  on public.noticias (orden_portada, fecha_publicacion)
  where estado = 'publicada' and es_portada;
