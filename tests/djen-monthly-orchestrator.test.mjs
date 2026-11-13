import test from 'node:test';
import assert from 'node:assert/strict';
import {splitDjenCalendarMonths,consultHistoricalCase} from '../lib/judicial-history-client.mjs';

test('meses com no maximo 31 dias',()=>{
 const ranges=splitDjenCalendarMonths({start:'2026-01-15',end:'2026-04-10'});
 assert.deepEqual(ranges,[
  {start:'2026-01-15',end:'2026-01-31'},
  {start:'2026-02-01',end:'2026-02-28'},
  {start:'2026-03-01',end:'2026-03-31'},
  {start:'2026-04-01',end:'2026-04-10'}
 ]);
});

test('consulta mensal usa DataJud uma vez e DJEN em cada janela, cache antes do navegador/servidor',async()=>{
 const requests=[];
 const result=await consultHistoricalCase({number:'1001218-36.2026.5.02.0040',start:'2026-01-01',end:'2026-03-02',source:'auto',
  fetchServer:async args=>{
   requests.push(args);
   if(args.cacheOnly)return {ok:false,cacheMiss:true};
   return {ok:true,items:[{id:args.source+'-'+args.start,source:args.source==='datajud'?'DataJud':'DJEN',date:args.start}]};
  }});
 const sources=['datajud','djen','djen','djen'];
 assert.deepEqual(requests.filter(x=>x.cacheOnly).map(x=>x.source),sources);
 assert.deepEqual(requests.filter(x=>!x.cacheOnly).map(x=>x.source),sources);
 assert.deepEqual(requests.filter(x=>!x.cacheOnly).map(x=>x.start),['2026-01-01','2026-01-01','2026-02-01','2026-03-01']);
 assert.equal(result.sourceStatus.datajud,'ok');assert.equal(result.sourceStatus.djen,'ok');
 assert.equal(result.partial,false);assert.equal(result.windowsChecked,3);assert.equal(result.items.length,4);
});

test('janela histórica explícita atualiza DJEN pelo navegador e preserva DataJud confirmado',async()=>{
 let browsed=0;
 const result=await consultHistoricalCase({number:'1001218-36.2026.5.02.0040',start:'2026-10-01',end:'2026-10-15',source:'auto',
  fetchServer:async args=>{
   if(args.cacheOnly&&args.source==='datajud')return {ok:false,cacheMiss:true};
   if(args.cacheOnly&&args.source==='djen')return {ok:true,fromCache:true,stale:true,items:[{source:'DJEN',id:'old',date:'2026-10-10'}]};
   if(args.source==='datajud')return {ok:true,items:[{source:'DataJud',id:'original',date:'2026-10-11'}]};
   throw Error('DJEN deveria ter sido consultado no navegador primeiro');
  },
  fetchBrowser:async()=>{browsed++;return {ok:true,source:'DJEN',via:'navegador',items:[{source:'DJEN',id:'new',date:'2026-10-13'}]}}
 });
 assert.equal(browsed,1);assert.equal(result.sourceStatus.djen,'ok_browser');
 assert.equal(result.sourceStatus.datajud,'ok');assert.equal(result.partial,false);
 assert.ok(result.items.find(x=>x.id==='original'));assert.ok(result.items.find(x=>x.id==='new'));
});

test('bloqueio HTTP 403 mantém cache anterior e não tenta contornar a fonte em outra rede',async()=>{
 let serverCalls=0,browserCalls=0;
 const result=await consultHistoricalCase({number:'1001218-36.2026.5.02.0040',start:'2026-01-01',end:'2026-08-01',source:'auto',
  fetchServer:async()=>{serverCalls++;return {ok:false,status:403,fromCache:true,items:[{source:'DJEN',id:'cached',date:'2026-01-02'}],error:'Fonte HTTP 403'}},
  fetchBrowser:async()=>{browserCalls++;throw Error('DJEN respondeu 403')}});
 assert.equal(serverCalls,2);assert.equal(browserCalls,0);
 assert.ok(result.items.some(x=>x.id==='cached'));assert.equal(result.partial,true);
 assert.ok(result.windowsPending>0);assert.notEqual(result.sourceStatus.djen,'ok');
});

test('nunca usa navegador alternativo para escapar bloqueio HTTP 429',async()=>{
 let browserCalls=0,serverCalls=0;
 const result=await consultHistoricalCase({number:'1001218-36.2026.5.02.0040',start:'2026-01-01',end:'2026-01-31',source:'auto',
  fetchServer:async()=>{serverCalls++;return {ok:false,status:429,error:'Fonte HTTP 429'}},
  fetchBrowser:async()=>{browserCalls++;throw Error('unexpected')},
  fetchDataJudBrowser:async()=>{browserCalls++;throw Error('unexpected')}});
 assert.equal(browserCalls,0);assert.equal(serverCalls,2);
 assert.equal(result.partial,true);assert.equal(result.ok,false);
});
