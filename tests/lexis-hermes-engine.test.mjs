import test from 'node:test';import assert from 'node:assert/strict';
import{lexisLegalFindings,lexisAgentQuality}from '../lib/lexis-hermes-engine.mjs';
import{buildSuperAgentReview}from '../lib/superagent-core.mjs';
const evt=(text,source='DataJud')=>({source,text,date:'2026-11-10',checked_at:'2026-11-12T10:00:00Z'});
test('Lexis identifies partial judgment only as source-linked textual indication',()=>{
 const r=lexisLegalFindings([evt('Julgo parcialmente procedentes os pedidos.')]);
 assert.equal(r.verdict.value,'parcialmente_procedente');assert.equal(r.verdict.basis,'indicio_textual');
 assert.equal(r.allCourtMovementsConfirmed,false);
});
test('Lexis does not label appeal argument or relief request as verdict',()=>{
 const r=lexisLegalFindings([evt('A parte alega sentença que julgou improcedente o pedido em outro processo.')]);
 assert.equal(r.verdict,null);
});
test('Lexis detects execution, free legal aid and verified source provenance',()=>{
 const r=lexisLegalFindings([evt('Iniciado cumprimento de sentença.'),evt('Defiro justiça gratuita.'),evt('Fixo honorários sucumbenciais de 10%.')]);
 assert.equal(r.enforcement.value,'cumprimento_iniciado');assert.equal(r.legalAid.value,'deferida');assert.equal(r.attorneyFees.percentage,10);
});
test('Conflicting dispositions are flagged for human review and never autoapplied',()=>{
 const r=lexisLegalFindings([evt('Julgo improcedentes os pedidos.'),evt('Julgo procedentes os pedidos.')]);
 const q=lexisAgentQuality({findings:r,sourceStatus:['DataJud'],events:[evt('Julgo procedentes os pedidos.')]});
 assert.ok(q.flags.some(x=>x.includes('distintos')));assert.equal(q.selfModify,false);assert.ok(q.improvementQueue.every(x=>x.autoApply===false));
});
test('Superagent incorporates Lexis engine for evidence in stored snapshots only',()=>{
 const num='1001218-36.2026.5.02.0040';
 const r=buildSuperAgentReview('Analise o processo '+num,{processes:[{process_number:num}],snapshots:[{process_number:num,source:'DataJud',checked_at:'2026-11-12T10:00:00Z',payload:{items:[{source:'DataJud',date:'2026-11-10',title:'Julgo parcialmente procedentes os pedidos.'}]}}]});
 assert.equal(r.findings.verdict.value,'parcialmente_procedente');assert.match(r.answer,/Indício de veredito:/);assert.equal(r.requiresReview,true);
});
