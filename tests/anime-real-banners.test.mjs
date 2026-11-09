import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const at=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('exact user-provided Naruto and Sasuke header images are committed at full panorama resolution',()=>{
 for(const theme of ['naruto','sasuke']){
  const path=new URL('../public/themes/banner-'+theme+'-wide.png',import.meta.url);
  const bytes=readFileSync(path);
  assert.equal(bytes.subarray(1,4).toString('ascii'),'PNG');
  assert.equal(bytes.readUInt32BE(16),2048);
  assert.equal(bytes.readUInt32BE(20),682);
  assert.ok(bytes.byteLength>1_000_000);
 }
});
test('banner CSS is imported last and paints the entire real header in both skins',()=>{
 const layout=at('app/layout.jsx'),css=at('app/anime-header-banners.css');
 assert.ok(layout.indexOf("anime-header-banners.css")>layout.indexOf("anime-immersive.css"));
 for(const theme of ['naruto','sasuke']){
  assert.match(css,new RegExp('data-crm-theme="'+theme+'"'));
  assert.ok(css.includes("banner-"+theme+"-wide.png"));
 }
 assert.match(css,/background-image:var\(--anime-banner-image\)!important/);
 assert.match(css,/background-size:cover!important/);
 assert.match(css,/\.reference-header/);
 assert.match(css,/\.task-header/);
 assert.match(css,/\.report-executive-hero/);
 assert.match(css,/::before/);
 assert.match(css,/content:none!important/);
 assert.match(css,/@media\s*\(max-width:\s*750px\)/);
 assert.match(css,/@media\s+print/);
});
