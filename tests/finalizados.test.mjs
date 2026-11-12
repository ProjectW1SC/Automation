import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_AREAS,areaFromQuery,crmAreaHref} from '../lib/crm-navigation.mjs';
import {isFinalizedClient,finalizedClients,reopenClientPatch} from '../lib/finalizados.mjs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('Finalizados replaces Revisar in the only shared navigation',()=>{
 assert.deepEqual(CRM_AREAS.map(x=>x.label),['Visão geral','Tarefas','Clientes','Processos','Gerador de processos','Leads','Superagente','Audiências','Veredito','Finalizados','Instituições','Minhas atividades','Relatórios','Configurações']);
 assert.equal(CRM_AREAS.some(x=>x.label==='Revisar'),false);
 assert.equal(crmAreaHref('Finalizados'),'/?aba=finalizados');
 assert.equal(areaFromQuery('?aba=finalizados'),'Finalizados');
 assert.equal(areaFromQuery('?aba=revisar'),'Finalizados');
});
test('Finalizados lists only explicitly completed workflow, regardless of sheet labels',()=>{
 const rows=[
 {id:'a',source_status:'finalizado_na_planilha',workflow_status:'ativo'},
 {id:'b',source_status:'vencido',workflow_status:'finalizado'},
 {id:'c',source_status:'quitado_na_planilha',workflow_status:'finalizado'},
 {id:'d',source_status:'finalizado_na_planilha',workflow_status:'ativo',workflow_override:'ativo'}
 ];
 assert.deepEqual(finalizedClients(rows).map(x=>x.id),['b','c']);
 assert.equal(isFinalizedClient(rows[0]),false);
});
test('Reopen requires reason and returns a minimal status patch without changing quitation evidence',()=>{
 assert.throws(()=>reopenClientPatch({workflow_status:'finalizado'},' '),/motivo/i);
 assert.deepEqual(reopenClientPatch({workflow_status:'finalizado',evidence_status:'quitacao_verificada'},'Novo contato confirmado'),{workflow_status:'ativo'});
 assert.throws(()=>reopenClientPatch({workflow_status:'ativo'},'Retomar contato'),/finalizado/i);
});
test('Finalizados UI supports reopen and hides unmatched review list',()=>{
 const ui=read('app/page.jsx');
 assert.match(ui,/page==='Finalizados'/);
 assert.match(ui,/reopenClient/);
 assert.match(ui,/Reabrir/);
 assert.doesNotMatch(ui,/page==='Revisar'/);
 const nav=read('components/crm-shell.jsx');
 assert.match(nav,/CRM_AREAS/);
});
test('Database prevents automatic sheet reconciliation from overriding manual reopen',()=>{
 const sql=read('supabase/migrations/20261109_004_reconciliacao_finalizados.sql');
 assert.match(sql,/workflow_override/);
 assert.match(sql,/auth\.uid\(\)/);
});
