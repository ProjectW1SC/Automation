import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../components/blackhole-hermes-agent.jsx',import.meta.url),'utf8');
test('Hermes UI reconciles new verified snapshots instead of displaying 403 forever',()=>{
 assert.match(s,/reconcileHermesScan/);assert.match(s,/crm_judicial_snapshots/);
 assert.match(s,/visibleSource\(r,'djen'\)/);
 assert.match(s,/Registro oficial posterior identificado/);
 assert.match(s,/90000/);
});
test('Hermes auto-refresh is read only and does not send duplicate requests to official CNJ APIs',()=>{
 assert.doesNotMatch(s,/fetch\('https:\/\/comunicaapi|fetch\('https:\/\/api-publica.datajud/);
 assert.match(s,/if\(!document.hidden\)load\(\)/);
});
