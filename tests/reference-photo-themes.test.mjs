import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';

const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('every reference screen uses genuine optimized image assets, not redrawn SVGs',()=>{
 for(const character of ['naruto','sasuke']){
  for(const view of ['overview','tasks','clients','institutions','finalized','sidebar','mark']){
   const path='../public/themes/reference-'+character+'-'+view+'.webp';
   const data=readFileSync(new URL(path,import.meta.url));
   assert.equal(data.toString('ascii',0,4),'RIFF',path);
   assert.equal(data.toString('ascii',8,12),'WEBP',path);
   assert.ok(data.length>450,path+' should contain reference image pixels');
   assert.ok(data.length<75000,path+' should be web optimized');
  }
 }
});

test('all anime areas render actual source image crops with page-specific banners',()=>{
 const css=text('app/anime-themes.css');
 assert.match(css,/reference-naruto-overview\.webp/);
 assert.match(css,/reference-sasuke-overview\.webp/);
 for(const screen of ['tasks','clients','institutions','finalized']){
  assert.match(css,new RegExp('reference-naruto-'+screen+'\\.webp'));
  assert.match(css,new RegExp('reference-sasuke-'+screen+'\\.webp'));
 }
 assert.match(css,/\.app-sidebar/);
 assert.match(css,/\.task-header/);
 assert.match(css,/\.reference-header/);
 assert.match(css,/report-dashboard/);
 assert.doesNotMatch(css,/url\(['"]?\/themes\/(naruto|sasuke)-(hero|sidebar)\.svg/);
});

test('theme logos are cropped from the user references, not generated monograms',()=>{
 const shell=text('components/crm-shell.jsx');
 const css=text('app/anime-themes.css');
 assert.match(shell,/app-brand-compact/);assert.match(shell,/app-brand-full/);
 assert.match(css,/reference-naruto-mark\.webp/);
 assert.match(css,/reference-sasuke-mark\.webp/);
});
