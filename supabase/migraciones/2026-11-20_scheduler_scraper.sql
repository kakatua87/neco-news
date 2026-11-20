-- Disparo externo del scraper: GitHub no cumple sus crons (entre el 10 y el 20/11 corrió ~26 % de lo programado).
-- pg_cron llama cada 2 horas (UTC, minuto :07) a GitHub Actions por la API (workflow_dispatch del workflow scrape.yml
-- del repo neco-news-scraper). El token es un fine-grained PAT con permiso "Actions: Read and write" SOLO sobre ese repo,
-- guardado en Supabase Vault con el nombre `github_dispatch_token` (nunca en este archivo). Vence: renovarlo antes.
--
-- Dentro del workflow, las corridas disparadas así se serializan con las programadas (concurrency) y la guarda de
-- `scrape.yml` omite una corrida si la última registrada en fuentes_salud tiene menos de 100 minutos.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Esquema privado: no queda expuesto por la API pública (PostgREST/GraphQL).
create schema if not exists automatizacion;

create or replace function automatizacion.disparar_scraper()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  token text;
  pedido bigint;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_dispatch_token';
  if token is null then
    raise exception 'Falta el secreto github_dispatch_token en el Vault';
  end if;
  select net.http_post(
    url := 'https://api.github.com/repos/kakatua87/neco-news-scraper/actions/workflows/scrape.yml/dispatches',
    body := '{"ref":"main"}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'Content-Type', 'application/json',
      'User-Agent', 'supabase-pg-cron-neco-news'
    ),
    timeout_milliseconds := 15000
  ) into pedido;
  return pedido;
end;
$$;

revoke all on function automatizacion.disparar_scraper() from public, anon, authenticated;

select cron.schedule('scrape-neco-news', '7 */2 * * *', $$select automatizacion.disparar_scraper()$$);

-- Verificar que funciona (204 = GitHub aceptó la orden):
--   select automatizacion.disparar_scraper();
--   select id, status_code, error_msg from net._http_response order by id desc limit 5;
-- Ver las ejecuciones programadas:
--   select jobname, status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
