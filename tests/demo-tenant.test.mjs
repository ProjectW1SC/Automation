import test from 'node:test';import assert from 'node:assert/strict';
import {isDemoBranding} from '../lib/demo-tenant.mjs';
import {buildDemoJudicialResult} from '../lib/demo-judicial-query.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
const num='9000001-00.2026.8.26.0001';
test('empresa ficticia e identificada somente pelo banco',()=>{
 assert.equal(isDemoBranding({infinitum_demo:true}),true);
 assert.equal(isDemoBranding({}),false);
});
test('dados ficticios nunca sao tratados como consulta oficial',()=>{
 const r=buildDemoJudicialResult({number:num,source:'auto',snapshots:[{source:'djen',payload:{demo:true,official:false,items:[{id:'fake1',source:'DJEN',date:'2026-11-01',title:'[SIMULAÇÃO] Publicação'}]}}]});
 assert.equal(r.demo,true);assert.equal(r.official,false);assert.equal(r.sourceStatus.djen,'simulated');assert.equal(r.items.length,1);
});
test('cliente nunca chama navegador ou fonte externa depois de obter dados demo',async()=>{
 let browser=0;
 const result=await consultHistoricalCase({number:num,source:'djen',
 fetchServer:async()=>buildDemoJudicialResult({number:num,source:'djen'}),
 fetchBrowser:async()=>{browser++;throw Error('Browser must not run')}});
 assert.equal(browser,0);assert.equal(result.demo,true);assert.equal(result.partial,false);
});
