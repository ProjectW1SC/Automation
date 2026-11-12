import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_AREAS,areaFromQuery,crmAreaHref} from '../lib/crm-navigation.mjs';
import {isFinalizedClient,finalizedClients,reopenClientPatch} from '../lib/finalizados.mjs';
const read=(file)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('finalizados da negociação antiga não aparecem no novo menu jurídico',()=>{
 assert.equal(CRM_AREAS.some(x=>x.label==='Finalizados'),false);
 assert.equal(CRM_AREAS.some(x=>x.label==='Painel jurídico'),true);
 assert.equal(crmAreaHref('Clientes'),'/clientes');
 assert.equal(areaFromQuery('?aba=finalizados'),'Painel jurídico');
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
test('a nova tela de clientes não consulta registros financeiros legados',()=>{
 const ui=read('components/office-console.jsx');
 assert.match(ui,/office_clients/);
 assert.doesNotMatch(ui,/crm_clients/);
 const nav=read('components/crm-shell.jsx');assert.match(nav,/CRM_AREAS/);
});
test('Database prevents automatic sheet reconciliation from overriding manual reopen',()=>{
 const sql=read('supabase/migrations/20261109_004_reconciliacao_finalizados.sql');
 assert.match(sql,/workflow_override/);
 assert.match(sql,/auth\.uid\(\)/);
});
