import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Infinitum oferece Light como padrão e Dark como segunda opção real',()=>{
 assert.deepEqual(CRM_THEMES.map(x=>x.id),['infinitum','infinitum-dark']);
 assert.equal(CRM_THEMES[0].label,'Infinitum Light · Padrão');
 assert.equal(resolveTheme(undefined),'infinitum');
 assert.equal(resolveTheme(''),'infinitum');
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
 assert.equal(resolveTheme('blackhole'),'infinitum');
 assert.equal(resolveTheme('inexistente'),'infinitum');
 const layout=read('app/layout.jsx');
 assert.match(layout,/infinitum-dark/);
 assert.match(layout,/data-crm-theme="infinitum"/);
 const settings=read('app/configuracoes/page.jsx');
 assert.match(settings,/setSelectedTheme/);
 assert.match(settings,/aria-pressed=\{selectedTheme===t.id\}/);
 assert.match(settings,/localStorage\.setItem\('projectw1sc\.crm-theme'/);
 assert.match(settings,/CRM_THEMES\.map/);
});

test('as duas paletas mantêm contraste WCAG AA em texto, navegação e botões',()=>{
 for(const t of CRM_THEMES){
  for(const [text,bg] of [['ink','page'],['ink','surface'],['muted','page'],['navInk','nav'],['accentInk','accent'],['tintInk','tint']]){
   assert.ok(contrastRatio(t[text],t[bg])>=4.5,t.id+' '+text+' '+bg);
  }
 }
});

test('o mesmo movimento e a mesma estrutura do CRM funcionam nos dois temas',()=>{
 const layout=read('app/layout.jsx'),css=read('app/infinitum-video-motion.css');
 const dual=read('app/infinitum-dual-themes.css');
 const board=read('components/office-kanban.jsx');
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(layout,/infinitum-dual-themes\.css/);
 assert.match(css,/data-crm-theme="infinitum-dark"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(dual,/data-crm-theme="infinitum"/);
 assert.match(dual,/data-crm-theme="infinitum-dark"/);
 assert.match(css,/office-kanban-column\[data-stage=/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/video-route-enter/);
 assert.match(board,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/STAGES\.map/);
});
