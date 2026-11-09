import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('two anime themes have genuine full-canvas vector wallpapers and vertical sidebar artwork',()=>{
 for(const character of ['naruto','sasuke']){
  for(const kind of ['wallpaper','sidebar']){
   const path='public/themes/'+kind+'-'+character+'.svg';
   assert.ok(existsSync(new URL(path,root)),path);
   const asset=read(path);
   assert.match(asset,/<svg[^>]+viewBox="0 0 /);
   assert.match(asset,/<(?:linearGradient|radialGradient|pattern)/);
   assert.doesNotMatch(asset,/<(?:text|foreignObject)\b/i,'No fake UI inside wallpaper');
  }
 }
});

test('full-app Naruto/Sasuke immersive layer is loaded LAST and scoping is theme-only',()=>{
 const layout=read('app/layout.jsx');
 const anime=read('app/anime-immersive.css');
 assert.match(layout,/import '\.\/anime-immersive\.css'/);
 assert.ok(layout.indexOf("anime-immersive.css")>layout.indexOf("anime-themes.css"));
 assert.match(anime,/data-crm-theme="naruto"/);
 assert.match(anime,/data-crm-theme="sasuke"/);
 assert.match(anime,/\.app-content/);
 assert.match(anime,/\.app-sidebar/);
 assert.match(anime,/background-size:cover/);
 assert.match(anime,/\.reference-dashboard/);
 assert.match(anime,/\.task-main/);
 assert.match(anime,/data-crm-background="image"/);
});

test('all live CRM views retain readable, themed cards and panels',()=>{
 const css=read('app/anime-immersive.css');
 for(const selector of ['.reference-kpi','.efferd-kpi','.dashboard-chart-card','.task-metric','.reference-panel','.task-board','.settings-panel','.sales-contact-focus','.report-filters','.processes-dashboard','.reference-activities','.report-dashboard']){
  assert.ok(css.includes(selector),selector);
 }
 assert.match(css,/--anime-wallpaper/);
 assert.match(css,/--anime-side-wallpaper/);
 assert.match(css,/background-size:100% 100%,cover/);
 assert.match(css,/mask-image:radial-gradient/);
 assert.match(css,/@media\s*\(max-width:750px\)/);
 assert.match(css,/@media\s+print/);
 assert.match(css,/prefers-reduced-motion/);
});
