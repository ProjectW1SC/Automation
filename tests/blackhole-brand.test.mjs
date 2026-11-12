import test from 'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('identidade Infinitum principal e BLACKHOLE opcional permanecem disponíveis',()=>{
 assert.match(read('lib/crm-themes.mjs'),/id:'blackhole'/);
 assert.match(read('components/crm-shell.jsx'),/branding\/blackhole-logo\.svg/);
 assert.match(read('app/layout.jsx'),/INFINITUM/);
 assert.match(read('components/crm-shell.jsx'),/pr-brand-name/);
 assert.match(read('app/layout.jsx'),/blackhole-theme\.css/);
 const css=read('app/blackhole-theme.css');
 assert.match(css,/data-crm-theme="blackhole"/);assert.match(css,/prefers-reduced-motion/);
});
test('folha de petições traz formato A4 e impressão',()=>{
 const ui=read('components/office-console.jsx'),css=read('app/blackhole-theme.css');
 assert.match(ui,/Imprimir|Impressão/);assert.match(css,/@page/);assert.match(css,/210mm/);
});
