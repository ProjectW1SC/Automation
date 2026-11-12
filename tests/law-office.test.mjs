import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {normalizeOfficeCNJ,validateOfficeDay,deadlineState,officeMiniReview,makePetitionSkeleton,canReplyWhatsApp,buildWhatsAppSuggestion,OFFICE_AGENTS} from '../lib/office-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CNJ é normalizado; entrada incompleta não se torna processo',()=>{
 assert.equal(normalizeOfficeCNJ('40044587220268260198'),'4004458-72.2026.8.26.0198');
 assert.equal(normalizeOfficeCNJ(''),null);
 assert.throws(()=>normalizeOfficeCNJ('1234'),/20 dígitos/i);
});
test('datas de prazos distinguem vencido, hoje, semana e data inválida',()=>{
 assert.equal(deadlineState({due_on:'2026-11-11',status:'aberto'},'2026-11-12'),'vencido');
 assert.equal(deadlineState({due_on:'2026-11-12',status:'aberto'},'2026-11-12'),'hoje');
 assert.equal(deadlineState({due_on:'2026-11-15',status:'aberto'},'2026-11-12'),'semana');
 assert.throws(()=>validateOfficeDay('2026-02-30'),/inválida/i);
});
test('mini agente prioriza sem fingir consulta ou envio',()=>{
 const review=officeMiniReview({deadlines:[
  {id:'a',title:'Prazo A',due_on:'2026-11-11',status:'aberto',verified:true,kind:'prazo'},
  {id:'b',title:'Prazo B',due_on:'2026-11-12',status:'aberto',verified:false,kind:'audiencia'}]},'2026-11-12');
 assert.equal(review.counts.overdue,1);
 assert.equal(review.counts.today,1);
 assert.equal(review.counts.unverified,1);
 assert.deepEqual(review.performedActions,[]);
 assert.equal(OFFICE_AGENTS.length,10);
});
test('petição nunca inventa partes, legislação nem atos oficiais',()=>{
 const draft=makePetitionSkeleton({kind:'manifestacao',caseRecord:{id:'c',title:'Processo consumerista',process_number:'4004458-72.2026.8.26.0198'}});
 assert.match(draft.body,/REVISÃO OBRIGATÓRIA/);
 assert.match(draft.body,/NENHUMA CONSULTA OFICIAL/);
 assert.match(draft.body,/LEGISLAÇÃO|LEGISLAÇÃO,/i);
 assert.match(draft.body,/ADVOGADO\(A\) RESPONSÁVEL/);
});
test('whatsapp: janela de 24h e nenhuma confirmação falsa',()=>{
 const now=new Date('2026-11-12T16:00:00Z');
 assert.equal(canReplyWhatsApp('2026-11-11T17:00:00Z',now),true);
 assert.equal(canReplyWhatsApp('2026-11-11T15:59:59Z',now),false);
 assert.match(buildWhatsAppSuggestion({body:'qual andamento do processo?'}),/conferir/);
});
test('escritório tem schema próprio, não apaga clientes legados automaticamente',()=>{
 const sql=read('supabase/migrations/20261112_019_law_office.sql');
 for(const table of ['office_clients','office_cases','office_deadlines','office_documents','office_whatsapp_messages','office_agent_runs'])
  assert.match(sql,new RegExp('create table if not exists public\\.'+table));
 assert.match(sql,/enable row level security/);
 assert.doesNotMatch(sql,/truncate\s+.*crm_clients/i);
});
