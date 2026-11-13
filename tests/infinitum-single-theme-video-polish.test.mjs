import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('somente o Infinitum Prestige permanece e preferências antigas retornam ao principal',()=>{
 assert.deepEqual(CRM_THEMES.map(theme=>theme.id),['infinitum']);
 for(const id of ['blackhole','video','naruto','sasuke','',null,'infinitum'])assert.equal(resolveTheme(id),'infinitum');
});

test('shell e configuração preservam páginas e não oferecem uma segunda estrutura visual',()=>{
 const shell=read('components/crm-shell.jsx');
 const settings=read('app/configuracoes/page.jsx');
 assert.match(shell,/app-sidebar/);
 assert.match(shell,/app-content/);
 assert.match(shell,/CRM_AREAS.map/);
 assert.doesNotMatch(shell,/crm-theme-select|Escolher tema visual|Selecionar tema no celular|<select[^>]*value=\{theme\}/);
 assert.doesNotMatch(settings,/tema claro do vídeo|O segundo reproduz/);
 assert.match(settings,/settings-theme-grid/);
});

test('efeitos do vídeo são apenas polimento visual, nunca reestruturam a área de trabalho',()=>{
 const css=read('app/infinitum-video-motion.css');
 assert.match(css,/video-route-enter/);
 assert.match(css,/\.app-sidebar\s*\{/);
 assert.match(css,/\.app-nav-link span/);
 assert.match(css,/office-kanban-column\[data-stage=/);
 assert.match(css,/border-top:3px solid var\(--phase\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/data-crm-theme="blackhole"/);
 assert.doesNotMatch(css,/grid-template-columns:\s*repeat\(5/);
 assert.doesNotMatch(css,/margin-left:70px!important|width:calc\(100% - 70px\)/);
 assert.doesNotMatch(css,/contain:layout style!important/);
 assert.doesNotMatch(css,/\.office-kanban-column\{[^}]*display:none!important/s);
});

test('tema é restaurado como infinitum antes da primeira pintura inclusive após legado blackhole',()=>{
 const layout=read('app/layout.jsx');
 assert.match(layout,/data-crm-theme="infinitum"/);
 assert.doesNotMatch(layout,/crmTheme="blackhole"|dataset\.crmTheme="blackhole"/);
 const shell=read('components/crm-shell.jsx');
 assert.match(shell,/projectw1sc\.crm-theme/);
 assert.match(shell,/resolveTheme/);
});
