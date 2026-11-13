import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const galaxyCss=()=>read('app/infinitum-login-video.css').split('/* GALAXY LOGIN FINAL */')[1]||'';

test('login loads the user-supplied galaxy asset, not the previous beige hero',()=>{
 const component=read('components/professional-auth.jsx');
 assert.match(component,/infinitum-login-hero\.mp4\?v=20261113-galaxy/);
 assert.match(component,/infinitum-login-poster\.webp\?v=20261113-galaxy/);
 assert.doesNotMatch(component,/20261113-hq/);
 const video=readFileSync(new URL('../public/branding/infinitum-login-hero.mp4',import.meta.url));
 assert.ok(video.byteLength>1_000_000,'Do not replace the moving asset with a low-resolution placeholder');
 assert.equal(video.toString('ascii',4,8),'ftyp');
});

test('desktop galaxy fills left column without letterboxes or empty side margins',()=>{
 const css=galaxyCss();
 assert.ok(css.length>0,'galaxy final CSS must override old styles');
 assert.match(css,/grid-template-columns:min\(55\.3125vw,98\.3333dvh\) minmax\(0,1fr\)!important/);
 assert.match(css,/object-fit:cover!important/);
 assert.match(css,/background-size:cover!important/);
 assert.match(css,/width:min\(420px,100%\)!important/);
 assert.match(css,/overflow-x:hidden!important/);
});

test('mobile galaxy remains visible above a functional responsive login',()=>{
 const css=galaxyCss();
 assert.match(css,/@media\(max-width:920px\)/);
 assert.match(css,/height:min\(101\.7vw,440px\)!important/);
 assert.match(css,/object-position:center top!important/);
 assert.match(css,/max-width:100%!important/);
});

test('Google unavailable guidance is compact, expandable and never hides email access',()=>{
 const login=read('components/secured-workspace.jsx');
 assert.match(login,/<details className="auth-google-help">/);
 assert.match(login,/<summary>/);
 assert.match(login,/crm-magic-link-btn/);
 assert.match(login,/signInWithPassword/);
 assert.match(login,/signInWithOAuth/);
});
