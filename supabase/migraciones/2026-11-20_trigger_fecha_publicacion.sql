-- Las notas de servicios (Farmacias de Turno, Avisos Fúnebres) se insertan como 'publicada' sin fecha_publicacion.
-- Con fecha nula quedaban primero en su sección (orden NULLS FIRST) y fuera del archivo. Si llega una nota
-- publicada sin fecha, se usa su created_at. Solo en INSERT: el flujo normal de publicación ya fija la fecha.
create or replace function public.noticias_fecha_publicacion_por_defecto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'publicada' and new.fecha_publicacion is null then
    new.fecha_publicacion := coalesce(new.created_at, now());
  end if;
  return new;
end;
$$;

create trigger noticias_fecha_publicacion_por_defecto
  before insert on public.noticias
  for each row execute function public.noticias_fecha_publicacion_por_defecto();
