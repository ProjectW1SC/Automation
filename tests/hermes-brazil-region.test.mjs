import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Hermes automated edge scan checks DJEN whole history, page 50 and longer upstream timeouts',()=>{
 const s=read('supabase/functions/blackhole-hermes-scan/index.ts');
 assert.doesNotMatch(s,/-29\*86400000/);
 assert.match(s,/itensPorPagina:"50"/);
 assert.match(s,/requestOfficialJson/);
 assert.doesNotMatch(s,/AbortSignal\.timeout\(14000\)/);
 assert.match(s,/query:\{match:\{numeroProcesso:digits\}\}/);
});
test('Cron always routes official scanner to sa-east-1 instead of US west database region',()=>{
 const s=read('supabase/migrations/20261112_031_hermes_brazilian_region.sql');
 assert.match(s,/forceFunctionRegion=sa-east-1/);assert.match(s,/'x-region','sa-east-1'/);
 assert.match(s,/timeout_milliseconds := 60000/);assert.doesNotMatch(s,/delete from|truncate|service_role/i);
});