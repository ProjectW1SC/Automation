import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotQueryKey,snapshotIsFresh,shrinkOfficialResult,hearingCandidates,verdictCandidates} from '../lib/judicial-triage.mjs';
const params=(q)=>new URLSearchParams(q);
test('cache mantém DJEN por janela e evita dados de outra janela',()=>{
 assert.equal(snapshotQueryKey('datajud',params('inicio=2026-01-01')),'latest');
 assert.equal(snapshotQueryKey('djen',params('inicio=2026-10-01&fim=2026-11-12')),'2026-10-01:2026-11-12:1');
 assert.equal(snapshotIsFresh({checked_at:'2026-11-12T12:00:00.000Z'},'djen',Date.parse('2026-11-12T12:14:00Z')),true);
 assert.equal(snapshotIsFresh({checked_at:'2026-11-12T12:00:00.000Z'},'djen',Date.parse('2026-11-12T12:16:00Z')),false);
});
test('resposta armazenada limita volume de texto, sem apagar origem',()=>{
 const obj=shrinkOfficialResult({ok:true,source:'DJEN',items:[{title:'A',description:'x'.repeat(3000),source:'DJEN'}]});
 assert.equal(obj.items[0].description.length,1800);assert.equal(obj.items[0].source,'DJEN');
});
test('audiências exigem data explícita no teor, não usam a data da publicação, e ignoram passadas',()=>{
 const rows=[{process_number:'1001218-36.2026.5.02.0040',source:'djen',checked_at:'2026-11-12T11:00:00Z',payload:{items:[
  {title:'Intimação',description:'Audiência de conciliação designada para 23/11/2026 às 14h30',source:'DJEN',date:'2026-11-12'},
  {title:'Audiência',description:'Sem indicação de data',source:'DataJud',date:'2026-12-20'},
  {title:'Audiência',description:'Audiência em 11/11/2026 às 10:00',source:'DJEN'},
  {title:'Intimação',description:'Audiência de conciliação designada para 23/11/2026 às 14h30',source:'DJEN'}
 ]}}];
 const found=hearingCandidates(rows,'2026-11-12');
 assert.equal(found.length,1);assert.equal(found[0].date,'2026-11-23');assert.equal(found[0].time,'14:30');
 assert.equal(found[0].type,'Conciliação');
});
test('veredito é hipótese, não sentença inventada',()=>{
 const rows=[{process_number:'1001218-36.2026.5.02.0040',source:'djen',checked_at:'2026-11-12T11:00:00Z',payload:{items:[
  {id:'a',title:'Sentença proferida',description:'Inteiro teor indisponível',source:'DJEN'},
  {id:'b',title:'Publicação',description:'Julgo parcialmente procedentes os pedidos',source:'DJEN'}
 ]}}];
 const found=verdictCandidates(rows);
 assert.equal(found.length,2);assert.ok(found.some(x=>x.label==='Possível procedência parcial'));
 assert.ok(found.some(x=>x.label==='Decisão a conferir'));
});
