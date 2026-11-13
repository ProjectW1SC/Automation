import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const s=readFileSync(new URL('../app/api/processos/consulta/route.js',import.meta.url),'utf8');
test('Infinitum prioritizes verified regional DJEN exit instead of 403 Vercel egress',()=>{
 assert.match(s,/regionalOfficial\('djen',number,params,token\)/);
 assert.match(s,/forceFunctionRegion=sa-east-1/);
 assert.match(s,/result\?\.region!=='sa-east-1'/);
 assert.match(s,/result\?\.authenticated!==true/);
});
test('DataJud uses bounded transport for rate-limited 429 and always validates timed_out/shards',()=>{
 assert.match(s,/requestOfficialJson/);
 assert.match(s,/validatePublicDataJudResponse\(payload\)/);
 assert.match(s,/body:JSON\.stringify\(\{size:1,query:\{match:\{numeroProcesso:digits\}\}\}\)/);
});
test('Brazilian Edge uses operator JWT and never service-role or arbitrary browser identity',()=>{
 assert.match(s,/Authorization:'Bearer '\+userJwt/);
 assert.match(s,/apikey:apiKey/);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|process\.env\.WA_AUTO_TOKEN/);
});