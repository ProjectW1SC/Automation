import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('Infinitum Light e Infinitum Dark são os dois temas oficiais',()=>{
 assert.deepEqual(CRM_THEMES.map(t=>t.id),['infinitum','infinitum-dark']);
 assert.equal(CRM_THEMES[0].mode,'light');
 assert.equal(CRM_THEMES[1].mode,'dark');
 assert.equal(resolveTheme('naruto'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'infinitum-dark');
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
 assert.equal(resolveTheme('inexistente'),'infinitum');
});

test('tema claro é padrão e a escolha escura pode ser restaurada antes da primeira pintura',()=>{
 const layout=read('app/layout.jsx'),shell=read('components/crm-shell.jsx');
 assert.match(layout,/data-crm-theme="infinitum"/);
 assert.match(layout,/data-crm-mode="light"/);
 assert.match(layout,/infinitum-dark/);
 assert.match(shell,/localStorage\.getItem\('projectw1sc\.crm-theme'\)/);
 assert.match(shell,/localStorage\.setItem\('projectw1sc\.crm-theme'/);
 assert.match(shell,/data\.user_metadata\?\.crm_theme/);
 assert.match(read('app/configuracoes/page.jsx'),/selectTheme/);
 assert.match(read('app/configuracoes/page.jsx'),/aria-pressed/);
 assert.match(layout,/infinitum-dual-themes\.css/);
});
