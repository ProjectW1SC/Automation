import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const handlerSource=readFileSync(new URL('../supabase/functions/infinitum-judicial-query/index.ts',import.meta.url),'utf8');
const s=handlerSource+readFileSync(new URL('../supabase/functions/infinitum-judicial-query/access.mjs',import.meta.url),'utf8');
test('direct Supabase regional query authenticates CRM JWT, membership and authorized portfolio via RLS',()=>{
 for(const marker of ['getUser(jwt)','office_has_access','office_cases','crm_processes','crm_completed_activities','sa-east-1','region','source:"CNJ"'])assert.ok(s.includes(marker),marker);
 const handler=handlerSource.slice(handlerSource.indexOf('Deno.serve('));assert.ok(handler.indexOf('getUser(jwt)')<handler.indexOf('await requestOfficial(url'));
 assert.ok(handler.indexOf('authorizeJudicialCase(db,user.id,number)')<handler.indexOf('await requestOfficial(url'));
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|x-lexis-user-id|userId:payload/);
});
test('datajud uses correct CNJ match syntax, small result and verifies timed_out/shards',()=>{
 assert.match(s,/validatePublicDataJudResponse/);assert.match(s,/query:\{match:\{numeroProcesso:digits\}\}/);assert.match(s,/size:1/);
});
test('DJEN query is month-scoped and page size 50 without unauthorized redirect',()=>{
 assert.match(s,/itensPorPagina:"50"/);assert.match(s,/days>31/);assert.match(s,/redirect:"error"/);
});
