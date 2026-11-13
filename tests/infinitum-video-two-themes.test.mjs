import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('só existe Infinitum Prestige; preferências legadas não habilitam um segundo tema',()=>{
 assert.deepEqual(CRM_THEMES.map(x=>x.id),['infinitum']);
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'infinitum');
 assert.equal(resolveTheme('inexistente'),'infinitum');
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/localStorage\.getItem\('projectw1sc\.crm-theme'\)/);
 assert.match(shell,/localStorage\.setItem\('projectw1sc\.crm-theme'/);
 assert.doesNotMatch(shell,/crm-theme-select|selectTheme\(/);
 const settings=read('app/configuracoes/page.jsx');
 assert.match(settings,/settings-theme-grid/);
 assert.match(settings,/CRM_THEMES\.map/);
 assert.doesNotMatch(settings,/setChosenTheme/);
});

test('paleta principal tem contraste AA em texto, navegação e etiquetas',()=>{
 for(const t of CRM_THEMES){
  for(const [text,bg] of [['ink','page'],['ink','surface'],['muted','page'],['navInk','nav'],['accentInk','accent'],['tintInk','tint']]){
   assert.ok(contrastRatio(t[text],t[bg])>=4.5,t.id+' '+text+' '+bg);
  }
 }
});

test('inspiração do vídeo preserva componentes reais e nunca remonta a grade desktop',()=>{
 const layout=read('app/layout.jsx'),css=read('app/infinitum-video-motion.css');
 const board=read('components/office-kanban.jsx');
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(css,/\[data-crm-theme="infinitum"\]/);
 assert.doesNotMatch(css,/\[data-crm-theme="blackhole"\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/office-kanban-column\[data-stage=/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/video-route-enter/);
 assert.match(board,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/STAGES\.map/);
});
