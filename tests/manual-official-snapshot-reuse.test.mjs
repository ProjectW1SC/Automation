import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {snapshotQueryKey} from '../lib/judicial-triage.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
import {sourceSummary} from '../lib/blackhole-office-scanner.mjs';
const num='3002816-74.2026.8.06.0154';
test('manual DJEN first page matches background snapshot key without merging pagination',()=>{
 assert.equal(snapshotQueryKey('djen',new URLSearchParams()),'default:default');
 assert.equal(snapshotQueryKey('djen',new URLSearchParams({pagina:'1'})),'default:default');
 assert.equal(snapshotQueryKey('djen',new URLSearchParams({pagina:'2'})),'default:default:2');
 assert.equal(snapshotQueryKey('djen',new URLSearchParams({inicio:'2026-11-01',fim:'2026-11-13'})),'2026-11-01:2026-11-13:1');
});
test('current manual scan uses Hermes default window and avoids browser retry on saved official result',async()=>{
 const requests=[];let browserCalls=0;
 const result=await consultHistoricalCase({number:num,source:'auto',
  fetchServer:async args=>{requests.push(args);return {ok:true,fromCache:true,stale:true,
   sourceStatus:{djen:'cached_previous',datajud:'timeout'},
   items:[{id:'pub1',source:'DJEN',date:'2026-11-12',title:'Publicação anterior'}]};},
  fetchBrowser:async()=>{browserCalls++;throw Error('não deveria executar')}});
 assert.equal(requests.length,2);
 assert.deepEqual(requests.map(({source,cacheOnly})=>[source,cacheOnly]),[['datajud',true],['djen',true]]);
 assert.equal(browserCalls,0);
 assert.equal(result.sourceStatus.djen,'cached_previous');
 assert.equal(result.partial,true);
 assert.equal(result.items.length,1);
});
test('explicit historical window keeps month partitioning',async()=>{
 const requests=[];
 await consultHistoricalCase({number:num,start:'2026-10-15',end:'2026-11-13',source:'djen',
  fetchServer:async args=>{requests.push(args);return {ok:true,items:[]}}});
 assert.deepEqual(requests.filter(r=>!r.cacheOnly).map(r=>[r.start,r.end]),[['2026-10-15','2026-10-31'],['2026-11-01','2026-11-13']]);
 assert.equal(requests.filter(r=>r.cacheOnly).length,2);
});

test('consulta manual DataJud usa cache antes e navegador antes do servidor',async()=>{
 const calls=[],saved=[];
 const result=await consultHistoricalCase({number:num,source:'datajud',
  fetchServer:async args=>{calls.push(args);return args.cacheOnly?{ok:false,cacheMiss:true,code:'cache_miss'}:{ok:false,error:'não deveria usar servidor'};},
  fetchDataJudBrowser:async()=>({ok:true,source:'DataJud',number:num,court:'TJCE',via:'navegador',
   found:true,checkedAt:'2026-11-13T12:00:00.000Z',items:[{id:'dj1',source:'DataJud',title:'Distribuição'}]}),
  saveBrowser:async entry=>{saved.push(entry);return {ok:true};}
 });
 assert.equal(calls.length,1);assert.equal(calls[0].cacheOnly,true);
 assert.equal(saved.length,1);assert.equal(saved[0].source,'datajud');
 assert.equal(result.sourceStatus.datajud,'ok_browser');
 assert.equal(result.items.length,1);
});

test('consulta manual não tenta servidor depois de HTTP 429 no navegador',async()=>{
 const calls=[];
 const result=await consultHistoricalCase({number:num,source:'datajud',
  fetchServer:async args=>{calls.push(args);return {ok:false,cacheMiss:true};},
  fetchDataJudBrowser:async()=>({ok:false,status:429,reason:'rate_limited',error:'HTTP 429'})
 });
 assert.equal(calls.length,1);
 assert.equal(result.sourceStatus.datajud,'rate_limited_429');
 assert.equal(result.partial,true);
 assert.equal(result.items.length,0);
});

test('consulta manual usa servidor como alternativa quando o navegador falha por CORS',async()=>{
 const calls=[];
 const result=await consultHistoricalCase({number:num,source:'datajud',
  fetchServer:async args=>{calls.push(args);return args.cacheOnly?{ok:false,cacheMiss:true}:
   {ok:true,source:'DataJud',found:true,items:[{id:'dj2',source:'DataJud',title:'Movimento do servidor'}],checkedAt:'2026-11-13T12:00:00.000Z'};},
  fetchDataJudBrowser:async()=>({ok:false,reason:'network_error',error:'Rede ou CORS'})
 });
 assert.equal(calls.length,2);assert.equal(calls[0].cacheOnly,true);assert.equal(calls[1].cacheOnly,undefined);
 assert.equal(result.sourceStatus.datajud,'ok');
 assert.equal(result.items[0].title,'Movimento do servidor');
});

test('consulta automática usa DataJud e DJEN no navegador antes de fallback individual',async()=>{
 const calls=[],saved=[];
 const result=await consultHistoricalCase({number:num,source:'auto',
  fetchServer:async args=>{calls.push(args);return {ok:false,cacheMiss:true};},
  fetchDataJudBrowser:async()=>({ok:true,source:'DataJud',number:num,court:'TJCE',via:'navegador',
   found:true,checkedAt:'2026-11-13T12:00:00.000Z',items:[{id:'dj3',source:'DataJud',title:'Movimento DataJud'}]}),
  fetchBrowser:async()=>({ok:true,source:'DJEN',number:num,via:'navegador',found:true,
   checkedAt:'2026-11-13T12:01:00.000Z',items:[{id:'dn3',source:'DJEN',title:'Publicação DJEN'}]}),
  saveBrowser:async entry=>{saved.push(entry);return {ok:true};}
 });
 assert.deepEqual(calls.map(x=>x.source),['datajud','djen']);
 assert.deepEqual(saved.map(x=>x.source),['datajud','djen']);
 assert.equal(result.sourceStatus.datajud,'ok_browser');
 assert.equal(result.sourceStatus.djen,'ok_browser');
 assert.equal(result.items.length,2);
});

test('cached historical result is not counted as a live verification',()=>{
 const result=sourceSummary({djen:{ok:true,fromCache:true,stale:true,sourceError:'Tempo esgotado',checkedAt:'2026-11-13T09:00:00Z',found:true,items:[{id:'pub1'}]},datajud:{ok:false,status:504,error:'O serviço esgotou o tempo.'}});
 assert.equal(result.djen.status,'cached_previous');
 assert.equal(result.djen.error,'Tempo esgotado');
 assert.equal(result.datajud.status,'timeout');
 assert.equal(result.availableSources,1);
 assert.equal(result.confirmedSources,0);
});
test('manual server keeps an exact-window snapshot on an upstream failure',()=>{
 const source=readFileSync(new URL('../app/api/processos/consulta/route.js',import.meta.url),'utf8');
 assert.ok(source.includes('if(cached?.payload?.ok===true)'));
 assert.ok(source.includes('sourceError:String(error?.message'));
 assert.ok(source.includes('stale:true,fromCache:true'));
});
