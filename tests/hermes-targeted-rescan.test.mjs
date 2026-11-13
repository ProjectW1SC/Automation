import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const s=readFileSync(new URL('../supabase/functions/blackhole-hermes-scan/index.ts',import.meta.url),'utf8');
test('scanner rescan requires internal cron authorization and a CNJ already in the office',()=>{
 assert.match(s,/if\(!await verifyToken\(db,token\)\)/);
 assert.match(s,/body\?\.targetCnj/);
 assert.match(s,/forcedCnj\?\[\]:recent\.data\|\|\[\]/);
 assert.match(s,/CNJ não pertence à carteira autorizada/);
 assert.match(s,/formatCnj\(body\.targetCnj\)/);
});
test('both failed sources produce a partial, unconfirmed result rather than an empty judgment',()=>{
 assert.match(s,/partial:!\(djStatus\.status==="confirmed"&&dnStatus\.status==="confirmed"\)/);
 assert.match(s,/As duas fontes não foram confirmadas nesta varredura/);
});
test('scanner normalizes APIKey and rejects DataJud index timeouts and partial shards',()=>{
 assert.match(s,/validatePublicDataJudResponse\(payload\)/);
 assert.match(s,/currentPublicKey\(Deno\.env\.get\("DATAJUD_API_KEY"\),PUBLIC_DATAJUD_KEY\)/);
});
