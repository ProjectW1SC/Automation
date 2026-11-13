import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('login keeps readable controls and grows naturally on short screens',()=>{
 const css=read('app/infinitum-login-video.css');
 assert.match(css,/width:min\(420px,100%\)!important/);
 assert.match(css,/height:auto!important/);
 assert.match(css,/overflow:visible!important/);
 assert.match(css,/min-height:48px!important/);
 assert.match(css,/font-size:16px!important/);
 const panel=css.match(/\.w1-auth-panel\{([^}]+)\}/)[1];
 assert.match(panel,/height:auto!important/);
 assert.doesNotMatch(css,/font-size:clamp\([^)]*dvh/);
 assert.match(css,/justify-content:flex-start!important/);
 assert.match(css,/margin-top:auto!important/);
});

test('mobile keeps the galaxy and a naturally sized form with independent branding',()=>{
 const css=read('app/infinitum-login-video.css');
 const mobile=css.slice(css.indexOf('@media(max-width:920px)'),css.indexOf('@media(max-width:480px)'));
 assert.match(mobile,/grid-template-columns:minmax\(0,1fr\)!important/);
 assert.match(mobile,/height:min\(101\.7vw,440px\)!important/);
 assert.match(mobile,/object-position:center top!important/);
 assert.match(mobile,/min-height:100svh!important/);
 assert.match(read('components/professional-auth.jsx'),/<span>INFINITUM<\/span>/);
});

test('loading and access-error states use the neutral Infinitum Prestige surface',()=>{
 const css=read('app/infinitum-login-video.css');
 const states=css.slice(css.indexOf('/* Telas pré-login'));
 assert.match(states,/\.reference-auth/);
 assert.match(states,/background:#fafaf9/);
 assert.match(states,/reference-auth::before/);
 assert.match(states,/blackhole-auth-fault/);
});
