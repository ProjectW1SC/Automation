import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('Prestige é principal e vídeo Infinitum é a segunda opção',()=>{
 assert.deepEqual(CRM_THEMES.map(t=>t.id),['infinitum','blackhole']);
 assert.equal(resolveTheme('naruto'),'infinitum');
 assert.equal(resolveTheme('blackhole'),'blackhole');
});
test('tema segundo é nativo, sem pacotes de imagens ou assets externos',()=>{
 const layout=read('app/layout.jsx');
 for(const legacy of ['anime-themes.css','anime-immersive.css','anime-header-banners.css','blackhole-theme.css'])assert.ok(!layout.includes(legacy));
 assert.match(layout,/infinitum-video-motion\.css/);
 assert.match(read('components/crm-shell.jsx'),/crm-theme-select/);
 assert.match(read('app/configuracoes/page.jsx'),/settings-theme-grid/);
});
