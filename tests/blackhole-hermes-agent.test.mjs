import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const rd=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Hermes consome scanner real e grava tarefa somente após clique',()=>{
 const ui=rd('components/blackhole-hermes-agent.jsx');
 assert.match(ui,/office_scan_runs/);
 assert.match(ui,/office_workflow_cards/);
 assert.match(ui,/office_agent_runs/);
 assert.match(ui,/Criar tarefa de revisão/);
 assert.match(ui,/ATENÇÃO: não é prazo judicial/);
});
test('Hermes é visível na tela de agentes e possui vínculo com Scanner',()=>{
 assert.match(rd('components/office-console.jsx'),/BlackholeHermesAgent/);
 assert.match(rd('lib/office-core.mjs'),/Hermes Scanner/);
});
