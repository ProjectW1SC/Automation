import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptLexisToExecutiveReport} from '../lib/lexis-report-adapter.mjs';
import {buildReport} from '../lib/report.mjs';
test('relatório Infinitum preserva cifras reais e não confunde encerrado com vencido',()=>{
 const rows=[
  {id:100,cliente:'Ana',status_interno:'EM ANDAMENTO',proximo_retorno:'2026-11-10',atendido_por:'a'},
  {id:101,cliente:'Bia',status_interno:'ENCERRADO',proximo_retorno:'2026-11-09',atendido_por:'a'},
  {id:102,cliente:'Cris',status_interno:'EM ANDAMENTO',proximo_retorno:'2026-11-20',atendido_por:'b'}
 ];
 const act=[
 {id:'1',processo_id:100,empresa_id:'e',categoria:'atendimento',data_realizacao:'2026-11-13',responsavel_auth_user_id:'a',contato_cliente_confirmado:true,descricao:'Cliente contatado'},
 {id:'2',processo_id:100,empresa_id:'e',categoria:'verificacao',data_realizacao:'2026-11-13',responsavel_auth_user_id:'a',contato_cliente_confirmado:false,descricao:'Movimentos verificados'}
 ];
 const x=adaptLexisToExecutiveReport({processes:rows,activities:act,members:[{auth_user_id:'a',nome:'Davi'},{auth_user_id:'b',nome:'Equipe'}]});
 assert.equal(x.clients.length,3);
 assert.equal(x.audit.length,1); assert.equal(x.manual.length,1);
 assert.equal(x.clients[0].assigned_to,'Davi');
 assert.equal(x.clients[1].workflow_status,'finalizado');
 assert.equal(x.audit[0].client_id,x.clients[0].id);
 const r=buildReport({...x,today:'2026-11-13',period:'mes',scope:'empresa'});
 assert.equal(r.portfolio.total,3);
 assert.equal(r.portfolio.finalized,1);
 assert.equal(r.portfolio.overdue,1);
 assert.equal(r.period.attendances,1);
 assert.equal(r.period.manualActivities,1);
});
test('sem responsável conhecido não exibe UUID em relatório',()=>{
 const x=adaptLexisToExecutiveReport({processes:[{id:1,cliente:'Teste',atendido_por:'a1b2c3d4-1111-4444-9999-aabbccddeeff'}]});
 assert.equal(x.clients[0].assigned_to,'Não identificado');
});
