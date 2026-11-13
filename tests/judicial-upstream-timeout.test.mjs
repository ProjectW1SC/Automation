import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('DataJud CNJ exact-number query follows official match API example',()=>{
 const s=read('app/api/processos/consulta/route.js');
 assert.match(s,/query:\{match:\{numeroProcesso:digits\}\}/);
 assert.doesNotMatch(s,/bool:\{should/);
});
test('runtime no longer aborts DataJud at 13-14 seconds',()=>{
 const s=read('app/api/processos/consulta/route.js');
 assert.match(s,/maxDuration=90/);assert.match(s,/requestOfficialJson/);assert.match(read('supabase/functions/_shared/official-http.mjs'),/45000/);
 assert.doesNotMatch(s,/AbortSignal\.timeout\(14000\)/);
 const gen=read('app/api/gerador-processos/datajud/route.js');
 assert.match(gen,/requestOfficialJson/);
 assert.match(gen,/maxDuration=90/);
});
test('DJEN real 50-item page cap reflected in pagination flag not 100',()=>{
 const s=read('app/api/processos/consulta/route.js');
 assert.match(s,/hasMore:info\.hasMore/);
 assert.match(read('lib/processos-oficiais.mjs'),/itensPorPagina:'50'/);
});
