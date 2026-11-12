import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('403/429 compartilha pausa por fonte e evita tentativas repetidas em outros CNJs',()=>{
 const s=read('app/api/processos/consulta/route.js');
 assert.match(s,/eq\('process_number','\*'\)/);
 assert.match(s,/map\(process_number=>/);
 assert.match(s,/officialBackoffActive\(entry\)/);
});
