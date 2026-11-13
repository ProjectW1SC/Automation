import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('login usa vídeo preservado com compressão suficiente para texto e detalhes visuais',()=>{
 const bytes=readFileSync(new URL('../public/branding/infinitum-login-hero.mp4',import.meta.url));
 assert.ok(bytes.length>1_000_000,'Não usar a versão excessivamente comprimida de 270 KB');
 assert.equal(bytes.toString('ascii',4,8),'ftyp');
});

test('o painel mostra só o vídeo da galáxia em largura e altura completas, sem faixas pretas',()=>{
 const css=read('app/infinitum-login-video.css');
 const final=css.split('/* GALAXY LOGIN FINAL */')[1];
 assert.ok(final,'the final galaxy override must exist');
 assert.match(final,/grid-template-columns:min\\(55\\.3125vw,98\\.3333dvh\\) minmax\\(0,1fr\\)!important/);
 assert.match(final,/object-fit:cover!important/);
 assert.match(final,/background-size:cover!important/);
 assert.doesNotMatch(final,/transform:scale\\(|animation:[^;]*zoom/);
 assert.match(final,/height:100dvh!important/);
});

test('login, recuperação e cadastro continuam separados do vídeo, inclusive sem movimento',()=>{
 const auth=read('components/professional-auth.jsx');
 const login=read('components/secured-workspace.jsx');
 assert.match(auth,/<video\b/);
 assert.match(auth,/preload="metadata"/);
 for(const method of ['signInWithPassword','signUp','resetPasswordForEmail','verifyOtp','signInWithOAuth'])assert.match(login,new RegExp(method));
 assert.match(read('app/infinitum-login-video.css'),/prefers-reduced-motion:reduce/);
});
