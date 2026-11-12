-- Ativação de consultas incrementais do Hermes a cada 15 minutos.
-- Não envia mensagens, não altera prazos e não inclui o token privado no SQL.
-- Cron usa o token cifrado no Vault apenas no momento da chamada.
select cron.schedule(
 'blackhole-hermes-official-scan',
 '*/15 * * * *',
 $cron$
 select net.http_post(
  url := 'https://ulkuhiibeoibbzhqrfya.supabase.co/functions/v1/blackhole-hermes-scan',
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'x-blackhole-cron-token',
   (select decrypted_secret from vault.decrypted_secrets where name='blackhole_hermes_cron_token' limit 1)
  ),
  body := '{"limit":1}'::jsonb,
  timeout_milliseconds := 30000
 ) as request_id;
 $cron$
);
