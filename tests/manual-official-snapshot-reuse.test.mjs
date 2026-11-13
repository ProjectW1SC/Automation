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
 assert.equal(requests.length,1);
 assert.ok(requests[0].signal instanceof AbortSignal);const {signal,...params}=requests[0];
 assert.deepEqual(params,{number:num,source:'auto',start:'',end:'',page:1});
 assert.equal(browserCalls,0);
 assert.equal(result.sourceStatus.djen,'cached_previous');
 assert.equal(result.partial,true);
 assert.equal(result.items.length,1);
});
test('explicit historical window keeps month partitioning',async()=>{
 const requests=[];
 await consultHistoricalCase({number:num,start:'2026-10-15',end:'2026-11-13',source:'djen',
  fetchServer:async args=>{requests.push(args);return {ok:true,items:[]}}});
 assert.deepEqual(requests.map(r=>[r.start,r.end]),[['2026-10-15','2026-10-31'],['2026-11-01','2026-11-13']]);
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
