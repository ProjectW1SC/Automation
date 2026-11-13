import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {officialBackoffDuration,officialBackoffActive} from '../lib/judicial-source-recovery.mjs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('respostas 403/429 suspendem novas tentativas temporariamente',()=>{
 assert.equal(officialBackoffDuration(403),20*60*1000);
 assert.equal(officialBackoffDuration(429),15*60*1000);
 assert.equal(officialBackoffDuration(500),0);
 const now=Date.parse('2026-11-12T15:00:00Z');
 assert.equal(officialBackoffActive({status:403,retry_after:'2026-11-12T15:10:00Z'},now),true);
 assert.equal(officialBackoffActive({status:403,retry_after:'2026-11-12T14:59:59Z'},now),false);
});
test('cooldown oficial protege somente dados do próprio usuário via RLS',()=>{
 const s=rd('supabase/migrations/20261112_022_official_source_backoff.sql');
 assert.match(s,/enable row level security/);assert.match(s,/actor_id=\(select auth\.uid\(\)\)/);
 assert.match(s,/revoke all on public\.office_official_backoff from public,anon/);
});
test('consulta automática expõe distinção entre DJEN e DataJud',()=>{
 const s=rd('app/api/processos/consulta/route.js');
 assert.match(s,/consultBothOfficialSources/);
 assert.match(s,/office_official_backoff/);
 assert.match(rd('lib/judicial-source-recovery.mjs'),/sourceStatus/);
});
