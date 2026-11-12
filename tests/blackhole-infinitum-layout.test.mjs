import test from 'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('navegação Blackhole vira rail fixo estreito sem deslocar conteúdo e usa Next Link',()=>{
 const css=read('app/blackhole-infinitum-studio.css'),ui=read('components/crm-shell.jsx');
 assert.match(css,/\.blackhole-studio-shell/);
 assert.match(css,/width:\s*56px/);
 assert.match(css,/position:\s*fixed/);
 assert.match(css,/margin-left:\s*56px/);
 assert.match(ui,/import Link from 'next\/link'/);
 assert.match(ui,/<Link key=\{item\.key\}/);
 assert.match(ui,/className="blackhole-shell-breadcrumb"/);
});
test('agentes têm galeria operacional e busca em vez de grade simples duplicada',()=>{
 const s=read('components/office-console.jsx');
 assert.match(s,/blackhole-agent-templates/);
 assert.match(s,/blackhole-agent-search/);
 assert.match(s,/Comercial/);assert.match(s,/Suporte/);assert.match(s,/Triagem/);assert.match(s,/Causas/);
});
test('Kanban oferece controles ativos e densidade de CRM, sem filtros decorativos',()=>{
 const s=read('components/office-kanban.jsx');
 assert.match(s,/blackhole-kanban-toolbar/);
 assert.match(s,/onChange=\{e=>setPriorityFilter/);
 assert.match(s,/onChange=\{e=>setTypeFilter/);
 assert.match(s,/office-kanban-columns/);
});
test('login respeita geometria de dois painéis da referência e mantém marca Blackhole',()=>{
 const css=read('app/blackhole-infinitum-studio.css');
 assert.match(css,/\.w1-auth-screen\[data-office-login="infinitum-reference"\]/);
 assert.match(css,/grid-template-columns:\s*minmax\(0,1fr\)\s+minmax\(0,1fr\)/);
 assert.match(css,/\/branding\/blackhole-symbol\.svg/);
});
