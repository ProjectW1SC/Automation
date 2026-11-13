import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Light é o tema inicial e Dark é a segunda paleta oficial',()=>{
 assert.deepEqual(CRM_THEMES.map(theme=>theme.id),['infinitum','infinitum-dark']);
 for(const id of ['blackhole','video','naruto','sasuke','',null])assert.equal(resolveTheme(id),'infinitum');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
});

test('shell e configuração preservam páginas e oferecem a escolha de tema sem duplicar estruturas',()=>{
 const shell=read('components/crm-shell.jsx');
 const settings=read('app/configuracoes/page.jsx');
 assert.match(shell,/app-sidebar/);
 assert.match(shell,/app-content/);
 assert.match(shell,/CRM_AREAS\.map/);
 assert.doesNotMatch(shell,/crm-theme-select|<select[^>]*value=\{theme\}/);
 assert.match(settings,/settings-theme-grid/);
 assert.match(settings,/aria-pressed=\{selectedTheme===t.id\}/);
});

test('efeitos de movimento são compartilhados sem reconstruir a grade desktop',()=>{
 const css=read('app/infinitum-video-motion.css');
 assert.match(css,/video-route-enter/);
 assert.match(css,/\.app-sidebar\s*\{/);
 assert.match(css,/\.app-nav-link span/);
 assert.match(css,/office-kanban-column\[data-stage=/);
 assert.match(css,/border-top:3px solid var\(--phase\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-crm-theme="infinitum-dark"/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.match(css,/sidebar-expanded \.app-content\{[^}]*margin-left:70px!important;[^}]*width:calc\(100% - 70px\)!important/s);
 assert.doesNotMatch(css,/contain:layout style!important/);
 const desktopRules=css.split('/* Ajustes operacionais já existentes')[0]; assert.doesNotMatch(desktopRules,/\.office-kanban-column\{[^}]*display:none!important/s);
});

test('tema claro é restaurado antes da primeira pintura e preferência Dark é preservada',()=>{
 const layout=read('app/layout.jsx');
 assert.match(layout,/data-crm-theme="infinitum"/);
 assert.match(layout,/infinitum-dark/);
 assert.doesNotMatch(layout,/dataset\.crmTheme="blackhole"/);
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/projectw1sc\.crm-theme/);
 assert.match(shell,/resolveTheme/);
});
