import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');

test('Prestige é o único tema e qualquer antiga escolha retorna ao principal',()=>{
 assert.deepEqual(CRM_THEMES.map(t=>t.id),['infinitum']);
 assert.equal(resolveTheme('naruto'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'infinitum');
 assert.equal(resolveTheme('infinitum'),'infinitum');
});

test('tema único usa CSS do vídeo só para acabamento e sem alternativas no menu',()=>{
 const layout=read('app/layout.jsx'),shell=read('components/crm-shell.jsx');
 for(const legacy of ['anime-themes.css','anime-immersive.css','anime-header-banners.css','blackhole-theme.css'])assert.ok(!layout.includes(legacy));
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.doesNotMatch(shell,/crm-theme-select/);
 assert.match(shell,/crm-mobile-dock/);
 assert.match(read('app/configuracoes/page.jsx'),/settings-theme-grid/);
});
