import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('endpoint de diagnóstico nunca divulga chaves, tokens nem finge consultar o DJEN',()=>{
 const code=read('app/api/health/route.js');
 assert.match(code,/VERCEL_GIT_COMMIT_SHA/);
 assert.match(code,/djen:'não executado'/);
 assert.match(code,/supabase:'não executado'/);
 assert.doesNotMatch(code,/SERVICE_ROLE_KEY|access_token|NEXT_PUBLIC_SUPABASE/);
 assert.match(code,/no-store/);
});
test('CI cancela verificações superadas na mesma branch',()=>{
 const code=read('.github/workflows/ci.yml');
 assert.match(code,/cancel-in-progress: true/);
 assert.match(code,/npm test/);
 assert.match(code,/npm run build/);
});
