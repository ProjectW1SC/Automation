import test from 'node:test';
import assert from 'node:assert/strict';
import {mapLexisProcess, resolveCompanyAccess, portfolioUpdate, dailyAttendanceSummary, normalizedCnj} from '../lib/lexis-shared-portfolio.mjs';

test('processo do Lexis mantém atendimento, retorno, responsável e protocolo sem inventar dados',()=>{
 const row={id:123,empresa_id:'empresa-a',cliente:'Cliente Teste',protocolo_ref:'0000000-00.2026.8.26.0100',ultimo_retorno:'2026-11-10',proximo_retorno:'2026-12-08',atendido_por:'Operador',status:'Em andamento',status_interno:'ativo',telefone:'11999999999',observacoes:'Histórico preservado',dados:{fase:'provas'}};
 const p=mapLexisProcess(row);
 assert.equal(p.id,123);
 assert.equal(p.client_name,'Cliente Teste');
 assert.equal(p.last_attendance,'2026-11-10');
 assert.equal(p.next_attendance,'2026-12-08');
 assert.equal(p.last_responsible,'Operador');
 assert.equal(p.process_number,row.protocolo_ref);
 assert.equal(p.observacoes,row.observacoes);
 assert.equal(p.status,'ativo');
 assert.equal(mapLexisProcess({id:1,empresa_id:'empresa-a'}).last_responsible,null);
});

test('acesso exige cadastro do Supabase Lexis na mesma empresa, mesmo para administrador',()=>{
 const users=[{auth_user_id:'a',empresa_id:'org-a',nome:'Ana'},{auth_user_id:'b',empresa_id:'org-b',nome:'Bia'}];
 assert.deepEqual(resolveCompanyAccess(users,'a'),users[0]);
 assert.equal(resolveCompanyAccess(users,'unknown'),null);
 assert.equal(resolveCompanyAccess([{auth_user_id:'a',empresa_id:'org-a'},{auth_user_id:'a',empresa_id:'org-b'}],'a'),null);
});

test('edição somente de campos autorizados, encerramento e exclusão são lógicos',()=>{
 assert.deepEqual(portfolioUpdate({cliente:' Renata ',telefone:'123',status_interno:'excluido',atendido_por:'Falsificado',empresa_id:'outra-empresa',dados:{id:1}}),{cliente:'Renata',telefone:'123',status_interno:'excluido'});
 assert.throws(()=>portfolioUpdate({status_interno:'sentença_procedente'}));
 assert.throws(()=>portfolioUpdate({proximo_retorno:'2026-99-88'}));
});

test('relatório conta somente atendimentos registrados com responsável e data comprovados',()=>{
 const rows=[{id:1,responsavel_auth_user_id:'a',data_realizacao:'2026-11-13',categoria:'atendimento',processo_id:44},
             {id:2,responsavel_auth_user_id:'b',data_realizacao:'2026-11-13',categoria:'outro',processo_id:44},
             {id:3,responsavel_auth_user_id:'b',data_realizacao:'2026-11-12',categoria:'atendimento',processo_id:45}];
 const x=dailyAttendanceSummary(rows,[{auth_user_id:'a',nome:'Ana'},{auth_user_id:'b',nome:'Bia'}]);
 assert.equal(x.total,2); assert.equal(x.uniqueProcesses,2);
 assert.deepEqual(x.byUser.map(u=>[u.name,u.count]),[['Ana',1],['Bia',1]]);
 assert.deepEqual(x.byDay.map(d=>[d.day,d.count]),[['2026-11-12',1],['2026-11-13',1]]);
});

test('consulta CNJ aceita só identificação processual sem presumir número ausente',()=>{
 assert.equal(normalizedCnj('0000000-00.2026.8.26.0100'),'0000000-00.2026.8.26.0100');
 assert.equal(normalizedCnj('sem número'),null);
});