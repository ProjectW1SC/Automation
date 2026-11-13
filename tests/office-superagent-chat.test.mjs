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

test('Qwen é verificado antes da seleção e falhas não enviam conteúdo para IA remota',()=>{
 const ui=read('app/superagente/page.jsx');
 const local=read('lib/blackhole-local-llm.mjs');
 const worker=read('public/workers/blackhole-qwen-0.5b.worker.mjs');
 assert.match(ui,/checkBlackholeQwenSupport/);
 assert.match(ui,/offlineBlackholeReply\(q\)/);
 assert.match(ui,/setEngine\('evidencias'\)/);
 assert.match(local,/requestAdapter/);
 assert.match(local,/if\(!support.ok\)throw/);
 assert.match(worker,/device:'webgpu'/);
 assert.doesNotMatch(worker,/device:\s*'cpu'/);
});
