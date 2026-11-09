import test from 'node:test';
import assert from 'node:assert/strict';
import {dateBR,moneyBR,parseTab,mergeClients,parseParties} from '../lib/normalize.mjs';
const id='sheet-1';
test('datas americanas e brasileiras são aceitas, 1899 é descartado',()=>{
 assert.equal(dateBR('6/29/2026'),'2026-06-29');assert.equal(dateBR('29/06/2026'),'2026-06-29');
 assert.equal(dateBR('12/30/1899'),null);assert.equal(dateBR('31/02/2026'),null);
});
test('valor brasileiro não vira quantia 100 vezes maior',()=>{assert.equal(moneyBR('R$ 58.379,36'),58379.36);assert.equal(moneyBR(''),null)});
test('coluna T é contato da instituição, não andamento processual',()=>{
 const row=[];row[1]='Pessoa Exemplo';row[2]='123.456.789-09';row[13]='Banco Exemplo';row[19]='Escritório Exemplo';row[5]='R$ 2.000,00';
 const a=parseTab('ANDAMENTO',[['NOME'],row],id);assert.equal(a.length,1);assert.equal(a[0].contacted_party,'Escritório Exemplo');assert.equal(a[0].source_status,'em_andamento');
});
test('QUITADOS tem cabeçalhos repetidos e não significa quitação confirmada',()=>{
 const head=['NEGOCIAÇÃO','NOME','CPF','FINANCEIRA'];const row=['AGENTE','Pessoa Exemplo','123.456.789-09','Banco Exemplo','11/04/2025','19/05/2025','','R$ 1.000,00'];
 const a=parseTab('QUITADOS',[['QUITADOS'],head,row],id);assert.equal(a.length,1);assert.equal(a[0].source_status,'quitado_na_planilha');assert.equal(a[0].sale_amount,1000);
});
test('deduplicação por documento conserva conflito entre abas',()=>{
 const a={doc_digits:'12345678909',source_tab:'ANDAMENTO',source_status:'em_andamento',name:'Pessoa Exemplo',phone:'11999999999'};
 const b={doc_digits:'12345678909',source_tab:'QUITADOS',source_status:'quitado_na_planilha',name:'Pessoa Exemplo',phone:''};
 const merged=mergeClients([a,b]);assert.equal(merged.length,1);assert.equal(merged[0].source_conflict,true);assert.equal(merged[0].phone,'11999999999');assert.equal(merged[0].source_status,'quitado_na_planilha');
});
test('financeiras e assessorias ficam em listas distintas',()=>{assert.deepEqual(parseParties([['BANCOS','CONTATO','','ASSESSORIAS','CONTATO'],['Banco Um','111','','Escritório Dois','222']]).map(x=>x.kind),['financeira','assessoria'])});
