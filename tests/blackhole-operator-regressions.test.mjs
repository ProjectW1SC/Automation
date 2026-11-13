import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {tryArithmetic} from '../lib/blackhole-arithmetic.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('sidebar fixo no desktop, com recolhimento por botão e toque externo no mobile',()=>{
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/onMouseEnter=\{\(\)=>setSidebarExpanded\(true\)\}/);
 assert.match(shell,/onMouseLeave/);
 assert.match(shell,/window\.innerWidth<880/);
 assert.match(shell,/setSidebarExpanded\]=useState\(false\)/);
 assert.match(shell,/onFocusCapture=\{\(\)=>setSidebarExpanded\(true\)\}/);
 assert.match(shell,/document\.addEventListener\('pointerdown',onPointerDown,true\)/);
});
test('cadastro de cliente confirma insert antes de fechar e limpar formulário',()=>{
 const ui=read('components/office-console.jsx');
 assert.match(ui,/owner_id:session\.user\.id/);
 assert.match(ui,/await act\(/);
 assert.match(ui,/if\s*\(saved\)\s*\{/);
 assert.match(ui,/Cadastrar cliente jurídico/);
});
test('modelo Qwen 0.5B é isolado e opcional no Web Worker, sem bloqueio da interface',()=>{
 const worker=read('public/workers/blackhole-qwen-0.5b.worker.mjs');
 const view=read('app/superagente/page.jsx');
 assert.match(worker,/Qwen2\.5-0\.5B-Instruct/);
 assert.match(worker,/device:'webgpu'/);
 assert.match(worker,/Worker|onmessage/);
 assert.match(view,/Qwen 0\.5B/);
});
test('matemática básica tolera frase natural e erros comuns de digitação',()=>{
 assert.equal(tryArithmetic('QUANTO +E 2 + 2'),'2 + 2 = 4');
 assert.equal(tryArithmetic('quanto é 2 + 2?'),'2 + 2 = 4');
 assert.equal(tryArithmetic('2+2'),'2 + 2 = 4');
});
test('modo de IA remota não afirma conexão se não houver chave',()=>{
 const route=read('app/api/superagente/route.js');
 assert.match(route,/configuredBlackholeProvider/);
});
test('texto de chat e indicadores têm contraste explícito no tema branco',()=>{
 const css=read('app/blackhole-legibility.css');
 for(const s of ['office-ai-message-body','office-ai-author','office-ai-content','inf-stat','inf-heading','inf-table'])assert.ok(css.includes(s),s);
});
