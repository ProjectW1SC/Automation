import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const themeCss=()=>read('app/anime-themes.css');

test('Naruto and Sasuke have real wide panorama canvases, not stretched full-screen UI captures',()=>{
 for(const theme of ['naruto','sasuke']){
  const svg=read('public/themes/panorama-'+theme+'.svg');
  assert.match(svg,/<svg[^>]+viewBox="0 0 1600 320"/);
  assert.match(svg,/<linearGradient/);
  assert.doesNotMatch(svg,/<text\b|<foreignObject\b/i);
 }
});

test('anime headers cover their entire width while keeping character artwork proportional',()=>{
 const css=themeCss();
 assert.match(css,/--anime-panorama:url\('\/themes\/panorama-naruto\.svg'\)/);
 assert.match(css,/--anime-panorama:url\('\/themes\/panorama-sasuke\.svg'\)/);
 assert.match(css,/background-size:cover!important/);
 assert.match(css,/--anime-portrait-size:auto/);
 assert.match(css,/background-size:var\(--anime-portrait-size\)/);
 assert.match(css,/\.reference-header,\.app-content \.task-header,\.report-dashboard \.report-executive-hero\)::before/);
 assert.match(css,/background-image:var\(--anime-hero\)/);
 assert.match(css,/mask-image:/);
});

test('all nine CRM areas use the same panoramic banner system',()=>{
 const css=themeCss();
 const selectors=[
  '.reference-dashboard .reference-header','.app-content .task-header',
  '.report-dashboard .report-executive-hero','.reference-activities',
  '.processes-dashboard','.settings-dashboard','[data-crm-area="overview"]',
  '[data-crm-area="clients"]','[data-crm-area="finalized"]','[data-crm-area="institutions"]'
 ];
 for(const selector of selectors) assert.ok(css.includes(selector),selector);
 for(const theme of ['naruto','sasuke']){
  for(const area of ['tasks','clients','institutions','finalized'])
   assert.ok(css.includes('reference-'+theme+'-'+area+'.webp'),theme+':'+area);
 }
 assert.match(css,/@media\(max-width:750px\)/);
 assert.match(css,/@media print/);
});
