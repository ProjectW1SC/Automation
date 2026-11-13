import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('superagente abre chat sem simular modelo remoto ou ações externas',()=>{
 const ui=read('app/superagente/page.jsx');
 assert.match(ui,/SecuredWorkspace/);assert.match(ui,/api\/superagente/);
 assert.match(ui,/office_agent_runs/);assert.match(ui,/external_actions:/);assert.match(ui,/consulta-judicial/);
 assert.match(ui,/history|historico/);
 assert.match(ui,/Habilidades/);assert.match(ui,/Conectores/);
 assert.match(ui,/payload\.model|motor local/);
});
test('interface leve desativa animações intensas quando solicitado',()=>{
 const css=read('app/office-superagent.css');
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/overflow-y:auto/);
});
