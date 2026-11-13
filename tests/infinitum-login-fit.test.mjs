import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('desktop login scales the form and controls to the reference viewport',()=>{
 const css=read('app/infinitum-login-video.css');
 const gallery=css.split('/* GALAXY LOGIN FINAL */')[1];
 assert.ok(gallery);
 assert.match(gallery,/grid-template-columns:min\(55\.3125vw,98\.3333dvh\) minmax\(0,1fr\)!important/);
 assert.match(gallery,/width:min\(420px,100%\)!important/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/height:clamp\(36px,4\.6dvh,49px\)!important/);
 assert.match(css,/min-height:clamp\(38px,4\.8dvh,50px\)!important/);
 assert.match(css,/justify-content:flex-start!important/);
 assert.match(css,/margin-top:auto!important/);
});

test('mobile keeps the full reference hero visible without cropping the video',()=>{
 const css=read('app/infinitum-login-video.css');
 const polish=css.split('/* GALAXY LOGIN FINAL */')[1];
 const mobileStart=polish.indexOf('@media(max-width:920px)');
 const mobileEnd=polish.indexOf('@media(max-width:480px)',mobileStart);
 const mobile=polish.slice(mobileStart,mobileEnd);
 assert.match(mobile,/height:min\(101\.7vw,440px\)!important/);
 assert.match(mobile,/object-fit:cover!important/);
 assert.match(mobile,/object-position:center top!important/);
});

test('loading and access-error states use the neutral Infinitum Prestige surface',()=>{
 const css=read('app/infinitum-login-video.css');
 const states=css.slice(css.indexOf('/* Telas pré-login'));
 assert.match(states,/\.reference-auth/);
 assert.match(states,/background:#fafaf9/);
 assert.match(states,/reference-auth::before/);
 assert.match(states,/blackhole-auth-fault/);
});
