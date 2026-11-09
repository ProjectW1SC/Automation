import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
const root=new URL('../',import.meta.url);
const file=path=>readFileSync(new URL(path,root),'utf8');

test('Naruto and Sasuke are first-class themes, with WCAG AA semantic colors',()=>{
 for(const id of ['naruto','sasuke']){
  const theme=CRM_THEMES.find(item=>item.id===id);
  assert.ok(theme,'Missing '+id+' theme');
  assert.equal(resolveTheme(id),id);
  for(const [foreground,background] of [
   ['ink','surface'],['muted','surface'],['accentInk','accent'],
   ['navInk','nav'],['tintInk','tint'],['warningInk','warningBg'],
   ['successInk','successBg'],['dangerInk','dangerBg'],['neutralInk','neutralBg']
  ]) assert.ok(contrastRatio(theme[foreground],theme[background])>=4.5,id+': '+foreground+' / '+background);
 }
});

test('Naruto and Sasuke apply globally without replacing live CRM pages',()=>{
 const css=file('app/anime-themes.css');
 const shell=file('components/crm-shell.jsx');
 const layout=file('app/layout.jsx');
 for(const id of ['naruto','sasuke']){
  assert.match(css,new RegExp('data-crm-theme="'+id+'"'));
  assert.ok(existsSync(new URL('public/themes/'+id+'-hero.svg',root)));
  assert.ok(existsSync(new URL('public/themes/'+id+'-sidebar.svg',root)));
 }
 assert.match(css,/\.reference-header/);
 assert.match(css,/\.task-header/);
 assert.match(css,/\.app-sidebar/);
 assert.match(css,/\.report-dashboard/);
 assert.match(css,/\.reference-panel/);
 assert.match(css,/@media print/);
 assert.match(shell,/CRM_THEMES\.map/);
 assert.match(layout,/anime-themes\.css/);
});

test('ProjectW1SC has a distinct scalable brand mark with a theme-aware logo',()=>{
 assert.ok(existsSync(new URL('public/themes/projectw1sc-mark.svg',root)));
 const logo=file('public/themes/projectw1sc-mark.svg');
 const shell=file('components/crm-shell.jsx');
 assert.match(logo,/<svg/);assert.match(logo,/W1SC/);
 assert.match(shell,/projectw1sc-mark\.svg/);
});

test('Bank and finance company fallback marks use approved distinctive styling, not broken remote images',()=>{
 const logo=file('components/institution-logo.jsx');
 const css=file('app/anime-themes.css');
 assert.match(logo,/getInstitutionBrand/);
 assert.match(logo,/customUrl/);
 assert.match(logo,/reference-institution-fallback/);
 assert.match(css,/reference-institution-mark/);
});
