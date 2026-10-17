-- Estadísticas de banners: impresiones (visualizaciones reales) y clics, agregados por día.
--
-- Se guarda UNA fila por banner y día (contadores), no un evento por visita: la tabla crece
-- con (banners × días), no con el tráfico. No se guarda IP ni ningún dato del visitante.
--
-- Solo el servidor (service_role, vía /api/banners/evento y /api/banners/click/[id]) puede
-- sumar; el admin puede leer. anon no tiene acceso a la tabla ni a la función.

create table if not exists public.banner_stats (
  banner_id    uuid    not null references public.banners(id) on delete cascade,
  dia          date    not null,   -- día calendario en hora de Argentina
  impresiones  integer not null default 0,
  clics        integer not null default 0,
  primary key (banner_id, dia)
);

alter table public.banner_stats enable row level security;

drop policy if exists admin_lee_banner_stats on public.banner_stats;
create policy admin_lee_banner_stats on public.banner_stats
  for select to authenticated using (public.is_admin());

create or replace function public.banner_registrar(p_banner uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if p_tipo not in ('impresion', 'clic') then
    raise exception 'tipo inválido';
  end if;
  -- Ignora ids de banners que no existen (evita llenar la tabla de basura / violar la FK).
  if not exists (select 1 from public.banners where id = p_banner) then
    return;
  end if;

  insert into public.banner_stats (banner_id, dia, impresiones, clics)
  values (
    p_banner, v_dia,
    case when p_tipo = 'impresion' then 1 else 0 end,
    case when p_tipo = 'clic' then 1 else 0 end
  )
  on conflict (banner_id, dia) do update set
    impresiones = public.banner_stats.impresiones + excluded.impresiones,
    clics       = public.banner_stats.clics + excluded.clics;
end;
$$;

revoke all on function public.banner_registrar(uuid, text) from public, anon, authenticated;
grant execute on function public.banner_registrar(uuid, text) to service_role;
