import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExcelSheets,dateValue,moneyValue} from '../lib/excel.mjs';
const exampleDoc='123.456.789-09';
test('data inválida de 1899 é descartada e serial do Excel é convertido',()=> {
  assert.equal(dateValue('30/12/1899'),null);
  assert.equal(dateValue(46041),'2026-01-19');
  assert.equal(moneyValue('R$ 2.345,67'),2345.67);
});
test('o mesmo CPF em duas abas usa chave de identidade correspondente, sem inventar quitação verificada',()=> {
  const kawan=Array(22).fill(null);kawan[1]='Pessoa Exemplo';kawan[2]=exampleDoc;kawan[13]='Banco Azul';kawan[19]='Escritório Exemplo';
  const quitado=Array(15).fill(null);quitado[4]='Pessoa Exemplo';quitado[6]=exampleDoc;quitado[7]='Banco Azul';
  const x=parseExcelSheets([{sheet:'KAWAN',data:[[],kawan]},{sheet:'Quitados',data:[[],[],quitado]}],'controle.xlsx');
  assert.equal(x.rows.length,2);
  assert.equal(x.rows[0].doc_digits,x.rows[1].doc_digits);
  assert.equal(x.rows[0].contacted_party,'Escritório Exemplo');
  assert.equal(x.rows[1].source_status,'quitado_na_planilha');
  assert.equal(Object.hasOwn(x.rows[1],'evidence_status'),false);
});
test('sem CPF não gera documento fictício nem correspondência automática por nome',()=> {
 const r=Array(29).fill(null);r[3]='Pessoa sem documento';
 const x=parseExcelSheets([{sheet:'CÓPIA VENDAS QUIT',data:[[],[],[],[],r]}],'excel.xlsx');
 assert.equal(x.rows.length,1); assert.equal(x.rows[0].doc_digits,'');
});
