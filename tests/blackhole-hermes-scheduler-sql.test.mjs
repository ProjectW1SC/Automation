import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('agendador usa Vault, pg_cron e pg_net sem gravar token em código',()=>{
 const sql=read('supabase/migrations/20261112_024_hermes_background_scheduler.sql');
 assert.match(sql,/create extension if not exists pg_cron/);assert.match(sql,/create extension if not exists pg_net/);
 assert.match(sql,/vault\.create_secret/);assert.match(sql,/office_cron_guard/);
 assert.match(sql,/trigger_mode.*scheduled/s);
 assert.match(sql,/record_office_source_cooldown/);
});
test('Edge Function exige token próprio e credencial service-role apenas no servidor',()=>{
 const s=read('supabase/functions/blackhole-hermes-scan/index.ts');
 assert.match(s,/x-blackhole-cron-token/);assert.match(s,/SUPABASE_SECRET_KEYS/);
 assert.match(s,/office_cron_guard/);assert.match(s,/crm_judicial_snapshots/);
 assert.match(s,/office_scan_runs/);assert.match(s,/office_agent_runs/);
 assert.doesNotMatch(s,/sendWhatsApp|sendEmail|office_deadlines\.insert/);
});
