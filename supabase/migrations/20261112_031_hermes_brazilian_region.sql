-- Force Hermes Edge Function to execute in São Paulo even though database is in us-west-2.
-- Use the existing Vault cron token; never persist it in Git or send it to browsers.
-- Cron runs one case per 15 minutes, respects source cooldowns and public API limits.
select cron.schedule(
 'blackhole-hermes-official-scan','*/15 * * * *',
 $cron$
 select net.http_post(
  url := 'https://ulkuhiibeoibbzhqrfya.supabase.co/functions/v1/blackhole-hermes-scan?forceFunctionRegion=sa-east-1',
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'x-region','sa-east-1',
   'x-blackhole-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='blackhole_hermes_cron_token' limit 1)
  ),
  body := '{"limit":1}'::jsonb,
  timeout_milliseconds := 60000
 ) as request_id;
 $cron$
);
