import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('captação segura não concede acesso anônimo direto aos leads',()=>{
 const sql=read('supabase/migrations/20261112_020_law_intake.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.office_intake from public,anon/);
 assert.doesNotMatch(sql,/create policy .* for insert to anon/i);
});
test('formulário só recebe opt-in com verificação anti-spam',()=>{
 const api=read('app/api/captacao/route.js');
 assert.match(api,/TURNSTILE_SECRET_KEY/);
 assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(api,/consent!==true/);
 assert.match(api,/siteverify/);
 const page=read('app/captacao/page.jsx');
 assert.match(page,/cf-turnstile/);
 assert.match(page,/conforme a LGPD/);
 assert.doesNotMatch(page,/SUPABASE_SERVICE_ROLE_KEY/);
});
