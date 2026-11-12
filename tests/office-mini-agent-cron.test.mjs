import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('daily agent runs through pg_cron, no Vercel paid cron, and logs no external actions',()=>{
 const s=read('supabase/migrations/20261112_030_office_daily_mini_agent.sql');
 assert.match(s,/cron\.schedule/);assert.match(s,/private\.office_auto_triage_tick/);
 assert.match(s,/external_actions/);assert.match(s,/,'scheduled','review'/);
 assert.match(s,/on conflict do nothing/);assert.doesNotMatch(s,/send_message|WhatsApp\.send|net\.http_post/);
});
test('agent UI states autonomous daily execution truthfully',()=>{
 const s=read('components/office-console.jsx');assert.match(s,/Supabase executa uma triagem diária/);assert.match(s,/Agendado automaticamente/);
});
