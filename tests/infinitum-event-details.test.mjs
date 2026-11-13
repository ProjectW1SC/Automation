import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Prazos, Agenda e Audiências abrem janela de detalhes imediatamente, nunca após a lista extensa',()=>{
 const operations=source('components/lexis-operations.jsx');
 assert.match(operations,/LexisEventDetails/);
 assert.match(operations,/onSelect={openDetails}/);
 assert.doesNotMatch(operations,/onSelect={setSelected}/);
 assert.doesNotMatch(operations,/selected&&<section className="pr-module lx-detail"/);
 assert.match(operations,/onClick=\{\(\)=>openDetails\(e\)\}/);
});
test('detalhe usa associação de processo pertencente à empresa e oferece dados reais e ações',()=>{
 const detail=source('components/lexis-event-details.jsx');
 for(const term of ['PortfolioDialog','PROCESS_FIELDS',".eq('empresa_id',empresaId)","process_id","protocolo_ref","process.phone","process.email","process.cpf","process.next_attendance","process.next_deadline"])assert.ok(detail.includes(term),term);
 const portfolio=source('lib/lexis-shared-portfolio.mjs');
 for(const field of ['telefone','email','cpf','proximo_retorno','proximo_prazo'])assert.ok(portfolio.includes(field),field);
 for(const action of ['editar-cliente','editar-processo','atendimento','consulta'])assert.ok(detail.includes(action),action);
 assert.match(detail,/Registro sem vínculo processual/);
 assert.match(detail,/office_deadlines/);
 assert.doesNotMatch(detail,/\.from\('processos'\)\.delete\(/);
});
test('links de detalhes acionam as funções reais e autorizadas da carteira existente',()=>{
 const shared=source('components/lexis-shared-office.jsx');
 assert.match(shared,/get\('processo'\)/);
 assert.match(shared,/get\('acao'\)/);
 assert.match(shared,/\.eq\('empresa_id',profile\.empresa_id\)/);
 assert.match(shared,/startEdit\(mapped,'cliente'\)/);
 assert.match(shared,/startEdit\(mapped,'processo'\)/);
 assert.match(shared,/attend\(mapped\)/);
 assert.match(shared,/consult\(mapped\)/);
});
