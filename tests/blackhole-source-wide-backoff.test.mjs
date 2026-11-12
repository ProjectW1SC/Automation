import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('403/429 cria cooldown compartilhado com o agendador e bloqueia novas requisições',()=>{
 const s=read('app/api/processos/consulta/route.js');
 assert.match(s,/office_source_cooldowns/);
 assert.match(s,/record_office_source_cooldown/);
 assert.match(s,/platformPause\.error/);
});
test('histórico diferencia execução automática de manual e foreground',()=>{
 const s=read('app/scanner/page.jsx');
 assert.match(s,/Agendado pelo servidor/);
 assert.match(s,/Execuções automáticas do servidor/);
});
