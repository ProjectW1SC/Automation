import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('login usa o vídeo original como hero e preserva formulário funcional',()=>{
 const auth=read('components/professional-auth.jsx');
 assert.match(auth,/<video[^>]*className="w1-auth-hero-video"/);
 assert.match(auth,/autoPlay/);assert.match(auth,/loop/);assert.match(auth,/muted/);assert.match(auth,/playsInline/);
 assert.match(auth,/\/videos\/infinitum-login-hero\.mp4/);
 assert.match(auth,/aria-hidden="true"/);
 assert.match(auth,/w1-auth-hero-copy/);
 const workspace=read('components/secured-workspace.jsx');
 for(const action of ['signInWithPassword','signUp','resetPasswordForEmail','signInWithOAuth'])assert.ok(workspace.includes(action));
});

test('asset de vídeo e poster existem e são carregados sem áudio',()=>{
 assert.ok(existsSync(new URL('../public/videos/infinitum-login-hero.mp4',import.meta.url)));
 assert.ok(existsSync(new URL('../public/videos/infinitum-login-poster.jpg',import.meta.url)));
});

test('o visual em vídeo fica isolado no login e adapta o corte no celular',()=>{
 const css=read('app/login-video.css'),layout=read('app/layout.jsx');
 assert.match(layout,/login-video\.css/);
 assert.match(css,/\.w1-auth-hero-video/);
 assert.match(css,/object-fit:\s*cover/);
 assert.match(css,/@media\s*\(max-width:\s*880px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.w1-auth-screen/);
 assert.doesNotMatch(css,/\.app-shell|\.app-content/);
});
