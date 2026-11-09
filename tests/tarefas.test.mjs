import test from 'node:test';
import assert from 'node:assert/strict';
import {todayBrazil,daysUntil,taskStatus,sortTaskQueue,filterTaskQueue,queueCounts,isAttendedToday,validateAttendance} from '../lib/tarefas.mjs';

const TODAY='2026-11-09';
const base={id:'1',name:'Cliente Exemplo',source_status:'em_andamento',workflow_status:'ativo',next_return:null,due_override:null,priority_level:'normal'};

test('datas no fuso de São Paulo e cálculo de atrasos são estáveis',()=>{
 assert.equal(todayBrazil(new Date('2026-11-10T01:30:00Z')),'2026-11-09');
 assert.equal(daysUntil('2026-11-08',TODAY),-1);
 assert.equal(daysUntil('2026-11-09',TODAY),0);
 assert.equal(daysUntil('2026-11-12',TODAY),3);
 assert.equal(daysUntil('30/12/1899',TODAY),null);
});
test('retornos vencidos, de hoje, em dia e sem data não se misturam',()=>{
 assert.equal(taskStatus({...base,next_return:'2026-11-08'},TODAY).code,'vencido');
 assert.equal(taskStatus({...base,next_return:TODAY},TODAY).code,'hoje');
 assert.equal(taskStatus({...base,next_return:'2026-11-10'},TODAY).code,'em_dia');
 assert.equal(taskStatus({...base,next_return:null,source_status:'vencido'},TODAY).code,'sem_data');
});
test('a data editada prevalece sobre a data importada sem alterar a origem',()=>{
 const client={...base,next_return:'2026-11-08',due_override:'2026-12-10'};
 assert.equal(taskStatus(client,TODAY).code,'em_dia');
 assert.equal(client.next_return,'2026-11-08');
});
test('finalizados saem da fila ativa, mas permanecem consultáveis',()=>{
 const finalized={...base,workflow_status:'finalizado',due_override:'2026-10-01'};
 assert.equal(taskStatus(finalized,TODAY).code,'finalizado');
 assert.equal(filterTaskQueue([finalized],{view:'prioridades',today:TODAY}).length,0);
 assert.equal(filterTaskQueue([finalized],{view:'finalizados',today:TODAY}).length,1);
});
test('fila exclusiva de vencidos não inclui em-dia, hoje ou finalizado',()=>{
 const all=[
  {...base,id:'v',next_return:'2026-11-02'},
  {...base,id:'h',next_return:'2026-11-09'},
  {...base,id:'f',next_return:'2026-11-11'},
  {...base,id:'c',next_return:'2026-10-01',workflow_status:'finalizado'},
  {...base,id:'s',source_status:'vencido'}
 ];
 assert.deepEqual(filterTaskQueue(all,{view:'vencidos',today:TODAY}).map(x=>x.id),['v']);
});
test('prioriza vencidos antigos e urgência; desempate estável',()=>{
 const all=[{...base,id:'f',next_return:'2026-11-19'},{...base,id:'v1',next_return:'2026-11-04'},{...base,id:'v2',next_return:'2026-11-08',priority_level:'urgente'},{...base,id:'h',next_return:TODAY}];
 const sorted=sortTaskQueue(all,TODAY);
 assert.equal(sorted[0].id,'v2');
 assert.ok(sorted.findIndex(x=>x.id==='v1') < sorted.findIndex(x=>x.id==='f'));
});
test('resumo separa vencidos, hoje, em dia, sem data, finalizados e atendidos hoje',()=>{
 const all=[{...base,id:'1',next_return:'2026-11-08',last_attendance_at:'2026-11-09T12:00:00Z'},{...base,id:'2',next_return:'2026-11-09'},{...base,id:'3',next_return:'2026-11-10'},{...base,id:'4'},{...base,id:'5',workflow_status:'finalizado'}];
 const r=queueCounts(all,TODAY);
 assert.deepEqual([r.vencido,r.hoje,r.em_dia,r.sem_data,r.finalizado,r.atendidos_hoje],[1,1,1,1,1,1]);
 assert.equal(isAttendedToday({last_attendance_at:'2026-11-10T01:30:00Z'},TODAY),true);
});
test('não registra atendimento vazio nem permite próximo retorno inválido',()=>{
 assert.throws(()=>validateAttendance({body:'',channel:'whatsapp',outcome:'contatado',next_due:'2026-12-09'}),/descreva/i);
 assert.throws(()=>validateAttendance({body:'Falamos',channel:'whatsapp',outcome:'contatado',next_due:'12/09/1899'}),/data/i);
 assert.deepEqual(validateAttendance({body:'Falamos por telefone',channel:'ligacao',outcome:'contatado',next_due:'2026-12-09'}),{body:'Falamos por telefone',channel:'ligacao',outcome:'contatado',next_due:'2026-12-09'});
});
