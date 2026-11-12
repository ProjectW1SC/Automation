import test from 'node:test';
import assert from 'node:assert/strict';
import {
 selectScheduledCases,normalizeDataJudSnapshot,normalizeDjenSnapshot,buildScheduledReview,resolveCourtAlias
} from '../supabase/functions/blackhole-hermes-scan/core.mjs';
const cnj='1001218-36.2026.5.02.0040';
const other='1001218-36.2026.5.02.0041';
test('fila automática prioriza retornos vencidos, ignora encerrados, CNJ inválido e consultas recentes',()=>{
 const officeCases=[
  {owner_id:'owner-a',process_number:cnj,title:'Caso principal',status:'ativo',next_review:'2026-11-10',updated_at:'2026-11-01'},
  {owner_id:'owner-a',process_number:other,title:'Encerrado',status:'encerrado',next_review:'2026-11-01'},
  {owner_id:'owner-b',process_number:'inválido',title:'Sem CNJ',status:'ativo',next_review:'2026-11-01'},
  {owner_id:'owner-b',process_number:'1001218-36.2026.5.02.0042',title:'Vencido',status:'ativo',next_review:'2026-11-11',updated_at:'2026-11-01'}
 ];
 const crmProcesses=[{actor_id:'owner-a',process_number:cnj,updated_at:'2026-11-01'},
  {actor_id:'owner-c',process_number:'1001218-36.2026.5.02.0043',updated_at:'2026-11-01'}];
 const recentRuns=[{actor_id:'owner-a',process_number:cnj,checked_at:'2026-11-12T14:00:00.000Z'}];
 const rows=selectScheduledCases({officeCases,crmProcesses,recentRuns,today:'2026-11-12',now:'2026-11-12T15:00:00.000Z',limit:2});
 assert.equal(rows.length,2);
 assert.equal(rows[0].process_number,'1001218-36.2026.5.02.0042');
 assert.equal(rows[1].process_number,'1001218-36.2026.5.02.0043');
});
test('DataJud só armazena o CNJ exato e distingue retorno válido sem processo',()=>{
 assert.equal(resolveCourtAlias(cnj),'tjsp');
 const payload={hits:{hits:[
  {_source:{numeroProcesso:other.replace(/\D/g,''),movimentos:[{nome:'Não pertence ao CNJ consultado'}]}},
  {_source:{numeroProcesso:cnj.replace(/\D/g,''),tribunal:'TJSP',movimentos:[{codigo:1,nome:'Distribuído',dataHora:'2026-11-10T12:00:00Z'}]}}
 ]}};
 const result=normalizeDataJudSnapshot(payload,cnj,'2026-11-12T15:00:00.000Z');
 assert.equal(result.ok,true);assert.equal(result.found,true);assert.equal(result.items.length,1);
 assert.equal(result.items[0].title,'Distribuído');
 const empty=normalizeDataJudSnapshot({hits:{hits:[]}},cnj,'2026-11-12T15:00:00.000Z');
 assert.equal(empty.ok,true);assert.equal(empty.found,false);
});
test('DJEN ignora comunicação de outro CNJ e exige formato de lista oficial',()=>{
 const payload={items:[
  {numero_processo:other.replace(/\D/g,''),texto:'Sentença improcedente',data_disponibilizacao:'2026-11-12'},
  {numero_processo:cnj.replace(/\D/g,''),texto:'Intimação disponibilizada',data_disponibilizacao:'2026-11-12',hash:'abc'}
 ]};
 const result=normalizeDjenSnapshot(payload,cnj,'2026-11-12T15:00:00.000Z');
 assert.equal(result.ok,true);assert.equal(result.found,true);assert.equal(result.items.length,1);
 assert.equal(result.items[0].source,'DJEN');
 assert.throws(()=>normalizeDjenSnapshot({html:'blocked'},cnj,'2026-11-12T15:00:00.000Z'),/lista/);
});
test('Hermes não usa data da publicação como data de audiência e classifica atos como indícios',()=>{
 const review=buildScheduledReview([{process_number:cnj,source:'DJEN',checked_at:'2026-11-12T15:00:00.000Z',
  payload:{items:[
   {source:'DJEN',date:'2026-11-12',title:'Audiência de instrução designada para 18/11/2026 às 14h00',description:'Sala 3'},
   {source:'DJEN',date:'2026-11-20',title:'Publicação com palavra audiência, sem data no teor',description:'Aguarde pauta'},
   {source:'DJEN',date:'2026-11-12',title:'Sentença: julgo parcialmente procedentes os pedidos',description:'Decisão a conferir'},
   {source:'DJEN',date:'2026-11-12',title:'Início do cumprimento de sentença',description:'Intime-se para pagamento'}
  ]}}],'2026-11-12');
 assert.equal(review.hearings.length,1);
 assert.equal(review.hearings[0].date,'2026-11-18');
 assert.equal(review.verdicts.length,1);
 assert.equal(review.verdicts[0].classification,'possível_parcial');
 assert.equal(review.enforcement.length,1);
 assert.equal(review.requiresHumanReview,true);
 assert.equal(review.performedActions.length,0);
});
