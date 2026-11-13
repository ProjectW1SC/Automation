import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Infinitum Light e Dark são selecionáveis e a opção Light é o padrão',()=>{
 assert.deepEqual(CRM_THEMES.map(x=>x.id),['infinitum','infinitum-dark']);
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
 assert.equal(resolveTheme('blackhole'),'infinitum-dark');
 assert.equal(resolveTheme('inexistente'),'infinitum');
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/localStorage\.getItem\('projectw1sc\.crm-theme'\)/);
 assert.match(shell,/localStorage\.setItem\('projectw1sc\.crm-theme'/);
 assert.match(shell,/selectTheme|theme-change/);
 const settings=read('app/configuracoes/page.jsx');
 assert.match(settings,/CRM_THEMES\.map/);
 assert.match(settings,/selectTheme/);
 assert.match(settings,/aria-pressed/);
 assert.match(read('app/layout.jsx'),/data-crm-mode="light"/);
});

test('as duas paletas têm contraste AA em texto, navegação, acento e etiquetas',()=>{
 for(const t of CRM_THEMES){
  for(const [text,bg] of [['ink','page'],['ink','surface'],['muted','page'],['navInk','nav'],['accentInk','accent'],['tintInk','tint']]){
   assert.ok(contrastRatio(t[text],t[bg])>=4.5,t.id+' '+text+' '+bg);
  }
 }
});

test('os tokens completos de cada tema chegam ao documento e os estilos cobrem as duas aparências',()=>{
 const appearance=read('lib/appearance-settings.mjs'),css=read('app/infinitum-dual-themes.css'),layout=read('app/layout.jsx');
 for(const token of ['--ui-nav','--ui-nav-ink','--ui-surface','--ui-border','--ui-accent','--ui-tint'])assert.ok(appearance.includes(token));
 assert.match(appearance,/data-crm-mode/);
 assert.match(css,/data-crm-mode="light"/);
 assert.match(css,/data-crm-mode="dark"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(layout,/infinitum-dual-themes\.css/);
});

test('inspiração do vídeo preserva componentes reais e nunca remonta a grade desktop',()=>{
 const layout=read('app/layout.jsx'),css=read('app/infinitum-video-motion.css');
 const board=read('components/office-kanban.jsx');
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(css,/video-route-enter/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(board,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/STAGES\.map/);
});
