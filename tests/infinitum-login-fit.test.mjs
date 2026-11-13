import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('desktop login scales the form and controls to the reference viewport',()=>{
 const css=read('app/infinitum-login-video.css');
 assert.match(css,/width:clamp\(260px,38dvh,420px\)!important/);
 assert.match(css,/height:100dvh!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/height:clamp\(36px,4\.6dvh,49px\)!important/);
 assert.match(css,/min-height:clamp\(38px,4\.8dvh,50px\)!important/);
 assert.match(css,/justify-content:flex-start!important/);
 assert.match(css,/margin-top:auto!important/);
});

test('mobile keeps the full reference hero visible without cropping the video',()=>{
 const css=read('app/infinitum-login-video.css');
 const polish=css.slice(css.indexOf('/* INFINITUM PRESTIGE'));
 const mobileStart=polish.indexOf('@media(max-width:920px)');
 const mobileEnd=polish.indexOf('@media(max-width:480px)',mobileStart);
 const mobile=polish.slice(mobileStart,mobileEnd);
 assert.match(mobile,/height:min\(101\.4vw,70svh,720px\)!important/);
 assert.match(mobile,/aspect-ratio:710 \/ 720!important/);
 assert.match(mobile,/object-fit:contain!important/);
 assert.doesNotMatch(mobile,/object-fit:cover!important/);
});

test('loading and access-error states use the neutral Infinitum Prestige surface',()=>{
 const css=read('app/infinitum-login-video.css');
 const states=css.slice(css.indexOf('/* Telas pré-login'));
 assert.match(states,/\.reference-auth/);
 assert.match(states,/background:#fafaf9/);
 assert.match(states,/reference-auth::before/);
 assert.match(states,/blackhole-auth-fault/);
});
