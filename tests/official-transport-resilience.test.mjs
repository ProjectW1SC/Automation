import test from 'node:test';
import assert from 'node:assert/strict';
import {requestOfficialJson,withOfficialDeadline,djenPageInfo} from '../supabase/functions/_shared/official-http.mjs';
import {officialDateIso} from '../supabase/functions/_shared/official-normalize.mjs';
import {normalizeDjen,normalizeDataJud} from '../lib/processos-oficiais.mjs';
import {normalizeDjenSnapshot,normalizeDataJudSnapshot} from '../supabase/functions/infinitum-judicial-query/core.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
import {officialBackoffDuration} from '../lib/judicial-source-recovery.mjs';
const number='0001234-56.2024.8.13.0100';
const good={timed_out:false,_shards:{failed:0},hits:{hits:[]}};
const response=(payload,status=200,headers={})=>new Response(JSON.stringify(payload),{status,headers});
test('DataJud retries only diagnosed fast search queue rejections, then returns actual data',async()=>{
 let calls=0;const delays=[];
 const result=await requestOfficialJson('https://official.test',{}, {fetchImpl:async()=>++calls<3?
  response({error:{type:'es_rejected_execution_exception'}},429):response(good),wait:async ms=>delays.push(ms)});
 assert.deepEqual(result,good);assert.equal(calls,3);assert.deepEqual(delays,[2000,4000]);
 assert.equal(officialBackoffDuration(429,{code:'search_queue_rejected'}),30000);
 assert.equal(officialBackoffDuration(429),900000);
});
test('quota, explicit block, gateway timeout and Retry-After beyond budget do not retry',async()=>{
 for(const [status,payload,headers] of [[429,{error:'quota'},{}],[403,{error:'blocked'},{}],[504,{},{}],
  [429,{error:{type:'es_rejected_execution_exception'}},{'Retry-After':'120'}]]){
  let calls=0;
  await assert.rejects(()=>requestOfficialJson('https://official.test',{}, {fetchImpl:async()=>{calls++;return response(payload,status,headers)}}),e=>e.status===status);
  assert.equal(calls,1);
 }
});
test('body that stalls after HTTP headers is also aborted by the attempt deadline',async()=>{
 let signal;
 await assert.rejects(()=>requestOfficialJson('https://official.test',{}, {timeoutMs:20,budgetMs:100,
  fetchImpl:async(_url,opts)=>{signal=opts.signal;return {ok:true,text:()=>new Promise(()=>{})}}}),e=>e.status===504);
 assert.equal(signal.aborted,true);
});
test('200 with timed_out never becomes an empty successful lookup; partial shards retry boundedly',async()=>{
 let calls=0;
 await assert.rejects(()=>requestOfficialJson('https://official.test',{}, {fetchImpl:async()=>{calls++;return response({...good,timed_out:true})}}),e=>e.code==='index_timeout');
 assert.equal(calls,1);
 calls=0;
 const result=await requestOfficialJson('https://official.test',{}, {fetchImpl:async()=>++calls===1?response({...good,_shards:{failed:1}}):response(good),wait:async()=>{}});
 assert.equal(calls,2);assert.deepEqual(result,good);
});
test('DJEN positive total and missing page retries same page, never confirms no history',async()=>{
 let calls=0;
 await assert.rejects(()=>requestOfficialJson('https://official.test',{}, {source:'djen',fetchImpl:async()=>{calls++;return response({count:3,items:[]})},wait:async()=>{}}),e=>e.code==='incomplete_page');
 assert.equal(calls,2);
 assert.equal(djenPageInfo({count:50,items:Array(50).fill({})},1).hasMore,false);
 assert.equal(djenPageInfo({count:51,items:Array(50).fill({})},1).hasMore,true);
 assert.equal(djenPageInfo({count:51,items:[{}]},2).hasMore,false);
});
test('DJEN masked field and DataJud 14-digit UTC-3 dates normalize in Node and Edge',()=>{
 const pub={numeroprocessocommascara:number,id:1,texto:'Publicação real de teste',data_disponibilizacao:'2026-10-02'};
 assert.equal(normalizeDjen({items:[pub]},number).length,1);
 assert.equal(normalizeDjenSnapshot({items:[pub]},number).items.length,1);
 assert.equal(officialDateIso('20261002153000'),'2026-10-02T18:30:00.000Z');
 const doc={numeroProcesso:number.replace(/\D/g,''),movimentos:[{dataHora:'20261002153000',movimentoNacional:{nome:'Julgamento',codigo:193}}]};
 const local=normalizeDataJud(doc,number),edge=normalizeDataJudSnapshot({hits:{hits:[{_source:doc}]}},number);
 assert.equal(local.movements[0].title,'Julgamento');assert.equal(edge.items[0].date,'2026-10-02T18:30:00.000Z');
});
test('DJEN displays its publications while the independent DataJud is still pending',async()=>{
 let finish;const gate=new Promise(resolve=>{finish=resolve});const updates=[];
 const resultPromise=consultHistoricalCase({number,independentSources:true,onResult:r=>updates.push(r),
  fetchServer:async({source})=>{if(source==='datajud')await gate;return {ok:true,items:source==='djen'?[{source:'DJEN',id:'pub',date:'2026-10-02'}]:[]}}});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(updates[0].items.length,1);assert.equal(updates[0].sourceStatus.datajud,'checking');
 finish();const result=await resultPromise;assert.equal(result.partial,false);assert.equal(result.items.length,1);
});
test('historical periods stop after 3 windows and expose an exact continuation',async()=>{
 let calls=0;
 const result=await consultHistoricalCase({number,source:'djen',start:'2026-01-01',end:'2026-12-31',fetchServer:async()=>{calls++;return {ok:true,items:[]}}});
 assert.equal(calls,3);assert.equal(result.windowsPending,9);assert.deepEqual(result.nextWindow,{start:'2026-04-01',end:'2026-04-30'});assert.equal(result.partial,true);
});
test('client ends even if adapter ignores abort; explicit cancellation aborts active request',async()=>{
 let calls=0;
 const result=await consultHistoricalCase({number,source:'djen',budgetMs:20,fetchServer:()=>{calls++;return new Promise(()=>{})}});
 assert.equal(calls,1);
 assert.equal(result.partial,true);assert.equal(result.ok,false);
 const controller=new AbortController();let activeSignal;
 const pending=consultHistoricalCase({number,source:'datajud',signal:controller.signal,
  fetchServer:({signal})=>{activeSignal=signal;return new Promise(()=>{})}});
 await new Promise(resolve=>setTimeout(resolve,5));controller.abort();
 await assert.rejects(()=>pending,e=>e.code==='cancelled');assert.equal(activeSignal.aborted,true);
});
test('deadline releases its parent abort listener after success',async()=>{
 const controller=new AbortController();let added=0,removed=0;
 const add=controller.signal.addEventListener.bind(controller.signal),remove=controller.signal.removeEventListener.bind(controller.signal);
 controller.signal.addEventListener=(...args)=>{added++;return add(...args)};
 controller.signal.removeEventListener=(...args)=>{removed++;return remove(...args)};
 assert.equal(await withOfficialDeadline(async()=>42,{signal:controller.signal}),42);
 assert.equal(added,removed);
});

test('temporary DataJud HTTP 503 can recover within the same bounded source request',async()=>{
 let calls=0;
 const result=await requestOfficialJson('https://official.test',{}, {fetchImpl:async()=>++calls===1?response({},503):response(good),wait:async()=>{}});
 assert.equal(calls,2);assert.deepEqual(result,good);
});
