import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from 'node:fs';
const src=readFileSync(new URL('../supabase/functions/blackhole-hermes-scan/index.ts',import.meta.url),'utf8');
test('Hermes performs a protected, sanitized live official probe from a selected Edge region',()=>{
 assert.match(src,/if\(body\?\.diagnostic===true\)/);
 assert.match(src,/verifyToken\(db,token\)/);
 assert.ok(src.indexOf('if(!await verifyToken(db,token))')<src.indexOf('if(body?.diagnostic===true)'));
 assert.match(src,/Deno\.env\.get\("SB_REGION"\)/);
 assert.match(src,/fetchDataJud\(number,checkedAt\)/);
 assert.match(src,/fetchDjen\(number,today,checkedAt\)/);
 assert.match(src,/office_source_cooldowns/);
 assert.doesNotMatch(src,/diagnostic.*?service_role/);
});