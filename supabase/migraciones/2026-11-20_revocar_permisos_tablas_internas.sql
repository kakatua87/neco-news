-- Tablas internas con RLS activado y sin ninguna policy: anon y authenticated no pueden leer ni escribir nada,
-- pero igual figuraban en el esquema GraphQL. El panel y el scraper acceden con la clave de servicio (service_role),
-- que no se ve afectada.
revoke all on table public.borradores_redaccion from anon, authenticated;
revoke all on table public.edicion_log from anon, authenticated;
revoke all on table public.envios_ciudadanos from anon, authenticated;
revoke all on table public.facebook_credenciales from anon, authenticated;
revoke all on table public.instagram_credenciales from anon, authenticated;
revoke all on table public.rate_limit_envios from anon, authenticated;
revoke all on table public.suscriptores from anon, authenticated;
revoke all on table public.x_credenciales from anon, authenticated;
