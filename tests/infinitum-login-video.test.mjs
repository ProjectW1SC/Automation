import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('the actual uploaded Infinitum login animation is bundled as a video, not a CSS-only imitation',()=>{
 const video=readFileSync(new URL('../public/branding/infinitum-login-hero.mp4',import.meta.url));
 assert.ok(video.length>50000,'an actual, optimized moving-video asset is required');
 assert.equal(video.toString('ascii',4,8),'ftyp');
 const poster=readFileSync(new URL('../public/branding/infinitum-login-poster.webp',import.meta.url));
 assert.ok(poster.length>1000);
 assert.equal(poster.toString('ascii',0,4),'RIFF');
 assert.equal(poster.toString('ascii',8,12),'WEBP');
});

test('the animation is only in the auth hero, is silent/looping and keeps the REAL sign-in form separate',()=>{
 const auth=read('components/professional-auth.jsx');
 const login=read('components/secured-workspace.jsx');
 assert.match(auth,/w1-auth-video/);
 assert.match(auth,/<video\b/);
 for(const flag of ['autoPlay','muted','loop','playsInline','poster='])assert.ok(auth.includes(flag),flag);
 assert.match(auth,/infinitum-login-hero\.mp4/);
 assert.match(auth,/infinitum-login-poster\.webp/);
 assert.ok(auth.indexOf('w1-auth-video')<auth.indexOf('w1-auth-panel'));
 assert.match(login,/signInWithPassword/);
 assert.match(login,/signUp/);
 assert.match(login,/resetPasswordForEmail/);
 assert.match(login,/signInWithOAuth/);
 assert.match(login,/verifyOtp/);
 assert.match(login,/remember/);
});

test('login-only video styling preserves the CRM principal and provides readable mobile/fallback views',()=>{
 const layout=read('app/layout.jsx'),css=read('app/infinitum-login-video.css');
 assert.match(layout,/infinitum-login-video\.css/);
 assert.match(css,/\.w1-auth-screen\[data-office-login="infinitum-reference"\]/);
 assert.match(css,/\.w1-auth-video/);
 assert.match(css,/object-fit:cover/);
 assert.match(css,/@media\s*\(max-width:\s*920px\)/);
 assert.match(css,/@media\s*\(max-width:\s*480px\)/);
 assert.match(css,/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
 assert.match(css,/focus-visible/);
 assert.doesNotMatch(css,/\.app-sidebar\s*\{/);
 assert.doesNotMatch(css,/\.app-content\s*\{/);
});
