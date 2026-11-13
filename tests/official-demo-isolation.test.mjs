import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildSuperAgentReview} from '../lib/superagent-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cnj='1001218-36.2026.5.02.0040';
const record={id:'case1',process_number:cnj,title:'Processo de demonstração',status:'ativo'};
test('superagente não trata sentença fictícia como decisão judicial verificada',()=>{
 const fake={source:'djen',process_number:cnj,checked_at:'2026-11-13',payload:{demo:true,official:false,
  items:[{source:'DJEN',title:'[SIMULAÇÃO] Sentença: julgo procedente',date:'2026-11-12'}]}};
 const result=buildSuperAgentReview('Analise o processo '+cnj,{processes:[record],snapshots:[fake]});
 assert.equal(result.stats.storedChecks,0);
 assert.equal(result.stats.simulatedChecks,1);
 assert.equal(result.events.length,0);
 assert.equal(result.source_status.length,0);
 assert.equal(result.simulatedEvents.length,1);
 assert.match(result.answer,/DEMONSTRAÇÃO/);
 assert.match(result.answer,/FICTÍCIO/);
 assert.equal(result.findings.verdict,null);
});
test('superagente mantém evidência real mesmo quando acompanhada de documento demo',()=>{
 const fake={source:'djen',process_number:cnj,payload:{demo:true,items:[{title:'[SIMULAÇÃO] Decisão'}]}};
 const real={source:'datajud',process_number:cnj,checked_at:'2026-11-13',payload:{ok:true,items:[{source:'DataJud',title:'Petição',date:'2026-11-12'}]}};
 const result=buildSuperAgentReview('Analisar processo '+cnj,{processes:[record],snapshots:[fake,real]});
 assert.equal(result.stats.storedChecks,1);
 assert.equal(result.source_status[0],'DATAJUD');
 assert.equal(result.events.length,1);
 assert.equal(result.stats.simulatedChecks,1);
});
test('scanner transporta marcação demo para impedir falsa triagem oficial',()=>{
 const route=read('app/api/scanner/route.js');
 assert.match(route,/demo:response.demo===true/);
 assert.match(route,/official:response.ok===true&&response.demo!==true/);
 assert.match(route,/buildSnapshot\('djen',djen\)/);
});
