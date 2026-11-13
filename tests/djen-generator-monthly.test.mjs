import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const ui=readFileSync(new URL('../app/gerador-processos/page.jsx',import.meta.url),'utf8');
test('gerador divide períodos longos antes de enviar à API e ao navegador',()=>{
 assert.match(ui,/splitDjenCalendarMonths/);assert.match(ui,/runDjenMonths/);
 assert.match(ui,/start:range.start,end:range.end/);
 assert.match(ui,/browseOfficialDjenSearch\(month\)/);
 assert.match(ui,/body:JSON.stringify\(month\)/);
});
test('gerador interrompe consultas no 429 e não declara resultado incompleto como completo',()=>{
 assert.match(ui,/response.status===429/);
 assert.match(ui,/completed===windows.length\?'ok':'error'/);
 assert.match(ui,/Consulta parcial/);
});
