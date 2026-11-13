import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('tema principal e segunda opção baseada no vídeo são selecionáveis e persistentes',()=>{
 assert.deepEqual(CRM_THEMES.map(x=>x.id),['infinitum','blackhole']);
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'blackhole');
 assert.equal(resolveTheme('inexistente'),'infinitum');
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/localStorage\.getItem\('projectw1sc\.crm-theme'\)/);
 assert.match(shell,/localStorage\.setItem\('projectw1sc\.crm-theme'/);
 assert.doesNotMatch(shell,/localStorage\.removeItem\('projectw1sc\.crm-theme'\)/);
 assert.match(shell,/onChange=\{e=>selectTheme\(e\.target\.value\)\}/);
 const settings=read('app/configuracoes/page.jsx');
 assert.match(settings,/settings-theme-grid/);
 assert.match(settings,/CRM_THEMES\.map/);
});

test('paletas têm cores acessíveis e não ocultam conteúdos',()=>{
 for(const t of CRM_THEMES){
  for(const [text,bg] of [['ink','page'],['ink','surface'],['muted','page'],['navInk','nav'],['accentInk','accent'],['tintInk','tint']]){
   assert.ok(contrastRatio(t[text],t[bg])>=4.5,t.id+' '+text+' '+bg);
  }
 }
});

test('réplica visual em componentes reais, não em overlay falso',()=>{
 const layout=read('app/layout.jsx');
 const css=read('app/infinitum-video-motion.css');
 const board=read('components/office-kanban.jsx');
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(css,/\[data-crm-theme="blackhole"\]/);
 assert.match(css,/\[data-crm-theme="infinitum"\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/office-kanban-columns/);
 assert.match(css,/transform/);
 assert.match(board,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/STAGES\.map/);
});
