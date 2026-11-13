import test from 'node:test';
import assert from 'node:assert/strict';
import {responsibleDisplay,statusForDate,processStatus,buildLexisEvents,isFinished} from '../lib/lexis-operations.mjs';
const today='2026-11-13';
const members=[
 {id:'ce5cce08-df14-48b3-a616-e8b2f7a02331',auth_user_id:'962a5a42-098d-4206-9a4f-f267e690cc9b',nome:'Dra. Maria Silva'},
 {id:'e72a59fd-d85f-4b4d-bbe1-1966249a14cf',auth_user_id:'7a96c673-c3a2-4e54-9b1e-9926792ddda4',nome:'Davi Alves Figueredo'}
];
test('responsável é nome em vez de UUID, por auth_user_id ou usuarios.id',()=>{
 assert.equal(responsibleDisplay(members[1].id,members),'Davi Alves Figueredo');
 assert.equal(responsibleDisplay(members[0].auth_user_id,members),'Dra. Maria Silva');
 assert.equal(responsibleDisplay('Davi Alves Figueredo',members),'Davi Alves Figueredo');
 assert.equal(responsibleDisplay('ca609f8b-8148-427f-b8ef-7a2b0ce11c66',members),'Não identificado');
 assert.equal(responsibleDisplay(null,members),'Não informado');
});
test('status do Lexis: encerrado, vencido, atenção, em dia; usa datas reais',()=>{
 assert.deepEqual(statusForDate('2026-11-12',{today}).key,'vencido');
 assert.deepEqual(statusForDate('2026-11-13',{today}).key,'atencao');
 assert.deepEqual(statusForDate('2026-11-16',{today}).key,'atencao');
 assert.deepEqual(statusForDate('2026-11-19',{today}).key,'em_dia');
 assert.deepEqual(statusForDate('2026-11-12',{today,finished:true}).key,'encerrado');
 assert.deepEqual(statusForDate(null,{today}).key,'sem_data');
 assert.equal(processStatus('ENCERRADO').key,'encerrado');
 assert.equal(processStatus('IMÓVEL').label,'Imóvel');
 assert.equal(isFinished('ENCERRADO'),true);
 assert.equal(isFinished('EM ANDAMENTO'),false);
});
test('junta retornos, tarefas, audiências e compromissos sem assumir prazo legado',()=>{
 const items=buildLexisEvents({
  processes:[{id:17,cliente:'Ana',protocolo_ref:'0000123-45.2026.8.26.0001',proximo_retorno:'2026-11-14',proximo_prazo:'2026-11-10',atendido_por:members[1].id,status_interno:'EM ANDAMENTO'}],
  hearings:[{id:8,protocolo_ref:'0000123-45.2026.8.26.0001',cliente:'Ana',tipo:'Conciliação',data_evento:'2026-11-20',hora_local:'09:30',situacao:'designada',fonte_url:'https://tribunal.example/s',protocolo_ref:'0000123-45.2026.8.26.0001'}],
  tasks:[{id:'t1',titulo:'Revisar documentos',due_at:'2026-11-13',feito:false,assignee_id:members[0].auth_user_id}],
  manual:[{id:'m1',title:'Reunião',due_on:'2026-11-15',kind:'tarefa',status:'aberto',responsible:members[0].id}],
  members,today
 });
 assert.deepEqual(items.map(x=>x.kind).sort(),['audiencia','retorno','tarefa','tarefa'].sort());
 assert.equal(items.find(x=>x.kind==='retorno').responsible,'Davi Alves Figueredo');
 assert.equal(items.some(x=>x.kind==='prazo'),false);
 assert.equal(items.find(x=>x.kind==='audiencia').status,'em_dia');
 assert.equal(items.find(x=>x.kind==='audiencia').source_url,'https://tribunal.example/s');
 assert.equal(items.find(x=>x.id==='task:t1').responsible,'Dra. Maria Silva');
});
test('audiência sem data permanece identificada sem ser confundida com retorno',()=>{
 const ev=buildLexisEvents({hearings:[{id:44,protocolo_ref:'0000123-45.2026.8.26.0001',cliente:'Sem data',data_evento:null,situacao:'pendente'}],today});
 assert.equal(ev.length,1);assert.equal(ev[0].kind,'audiencia');assert.equal(ev[0].status,'sem_data');assert.equal(ev[0].due_on,null);
});
test('processo encerrado não conta como retorno vencido, data anterior de audiência não vira futuro',()=>{
 const items=buildLexisEvents({processes:[{id:1,protocolo_ref:'0000123-45.2026.8.26.0001',cliente:'R',status_interno:'ENCERRADO',proximo_retorno:'2026-11-10'}],
 hearings:[{id:5,protocolo_ref:'0000123-45.2026.8.26.0001',cliente:'I',data_evento:'2026-11-09',situacao:'cancelada'}],today});
 assert.equal(items[0].status,'encerrado');
 assert.equal(items.find(i=>i.kind==='audiencia').status,'encerrado');
});
