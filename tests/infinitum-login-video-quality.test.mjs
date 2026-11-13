import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('login usa vídeo preservado com compressão suficiente para texto e detalhes visuais',()=>{
 const bytes=readFileSync(new URL('../public/branding/infinitum-login-hero.mp4',import.meta.url));
 assert.ok(bytes.length>1_000_000,'Não usar a versão excessivamente comprimida de 270 KB');
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
});

test('vídeo fica inteiro no painel esquerdo sem zoom ou recorte automático',()=>{
 const css=read('app/infinitum-login-video.css');
 const videoRule=css.match(/\.w1-auth-video\s*\{([^}]+)\}/);
 assert.ok(videoRule);
 assert.match(videoRule[1],/object-fit:\s*contain\s*!important/);
 assert.match(videoRule[1],/object-position:\s*center center\s*!important/);
 assert.doesNotMatch(videoRule[1],/scale\(|transform:|object-fit:\s*cover/);
 assert.match(css,/\.w1-auth-video-poster\s*\{[^}]*background:[^}]*\/contain/s);
 assert.doesNotMatch(css,/object-position:\s*center 19%/);
 assert.match(css,/aspect-ratio:\s*710\s*\/\s*720/);
});

test('login, recuperação e cadastro continuam separados do vídeo, inclusive sem movimento',()=>{
 const auth=read('components/professional-auth.jsx');
 const login=read('components/secured-workspace.jsx');
 assert.match(auth,/<video\b/);
 assert.match(auth,/preload="metadata"/);
 for(const method of ['signInWithPassword','signUp','resetPasswordForEmail','verifyOtp','signInWithOAuth'])assert.match(login,new RegExp(method));
 assert.match(read('app/infinitum-login-video.css'),/prefers-reduced-motion:reduce/);
});
