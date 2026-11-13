import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('Infinitum Light é padrão e Dark permanece selecionável',()=>{
 assert.deepEqual(CRM_THEMES.map(t=>t.id),['infinitum','infinitum-dark']);
 assert.equal(resolveTheme('naruto'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'infinitum');
 assert.equal(resolveTheme('infinitum'),'infinitum');
 assert.equal(resolveTheme('infinitum-dark'),'infinitum-dark');
});

test('os dois temas usam a mesma estrutura, responsividade e animações',()=>{
 const layout=read('app/layout.jsx'),shell=read('components/crm-shell.jsx');
 for(const legacy of ['anime-themes.css','anime-immersive.css','anime-header-banners.css','blackhole-theme.css'])assert.ok(!layout.includes(legacy));
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(layout,/infinitum-dual-themes\.css/);
 assert.match(shell,/crm-mobile-dock/);
 const settings=read('app/configuracoes/page.jsx');
 assert.match(settings,/settings-theme-grid/);
 assert.match(settings,/setSelectedTheme/);
});
