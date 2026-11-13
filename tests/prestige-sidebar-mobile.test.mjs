import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('mobile inicia com menu recolhido sem alterar default desktop',()=>{const x=read('components/crm-shell.jsx');assert.match(x,/window\.innerWidth<880\)setSidebarExpanded\(false\)/);assert.match(x,/setSidebarExpanded\]=useState\(false\)/);});
test('títulos do menu correspondem à interface legal apresentada',()=>{const x=read('components/crm-shell.jsx');for(const name of ['Dashboard','Comunicação','Procedimentos','Documentos'])assert.ok(x.includes(name));});
test('marca tem fallback em demais paletas',()=>{assert.match(read('app/prestige-final-polish.css'),/not\(\[data-crm-theme="infinitum"\]\) \.pr-brand/);});
