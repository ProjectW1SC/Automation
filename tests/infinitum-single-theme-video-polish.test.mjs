import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('os dois temas Infinitum preservam a mesma estrutura e preferências legadas',()=>{
 assert.deepEqual(CRM_THEMES.map(theme=>theme.id),['infinitum','infinitum-dark']);
 for(const id of ['video','naruto','sasuke','',null])assert.equal(resolveTheme(id),'infinitum');
 assert.equal(resolveTheme('blackhole'),'infinitum-dark');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
});

test('shell e configuração permitem trocar o tema sem criar uma segunda estrutura visual',()=>{
 const shell=read('components/crm-shell.jsx');
 const settings=read('app/configuracoes/page.jsx');
 assert.match(shell,/app-sidebar/);
 assert.match(shell,/app-content/);
 assert.match(shell,/CRM_AREAS\.map/);
 assert.match(shell,/projectw1sc:theme-change/);
 assert.match(settings,/settings-theme-grid/);
 assert.match(settings,/selectTheme/);
 assert.match(settings,/Infinitum Light/);
 assert.match(settings,/Infinitum Dark/);
 assert.match(settings,/aria-pressed/);
 assert.doesNotMatch(settings,/O visual principal Prestige é o único tema/);
});

test('efeitos do vídeo preservam componentes reais e respeitam os dois modos',()=>{
 const layout=read('app/layout.jsx'),css=read('app/infinitum-video-motion.css');
 const board=read('components/office-kanban.jsx');
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(css,/video-route-enter/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/office-kanban-column\[data-stage=/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(board,/office-kanban-card/);
 assert.match(board,/onDragStart/);
 assert.match(board,/onDrop/);
 assert.match(board,/STAGES\.map/);
});
