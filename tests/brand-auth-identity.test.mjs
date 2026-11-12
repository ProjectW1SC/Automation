import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('brand assets are included in the repository as actual images',()=>{
 assert.ok(existsSync(new URL('../public/branding/projectw1sc-symbol.svg',import.meta.url)));
 assert.ok(existsSync(new URL('../public/branding/projectw1sc-wordmark.svg',import.meta.url)));
 assert.match(file('public/branding/projectw1sc-symbol.svg'),/data:image\/webp;base64,/);
 assert.match(file('public/branding/projectw1sc-wordmark.svg'),/data:image\/webp;base64,/);
});

test('sidebar uses compact and extended brand marks, not old text lockup',()=>{
 const shell=file('components/crm-shell.jsx');
 assert.match(shell,/projectw1sc-symbol\.svg/);
 assert.match(shell,/projectw1sc-wordmark\.svg/);
 assert.match(shell,/app-brand-compact/);
 assert.match(shell,/app-brand-full/);
});

test('login and recovery retain the same authentication handlers with a shared professional layout',()=>{
 const home=file('components/secured-workspace.jsx');
 const auth=file('components/professional-auth.jsx');
 assert.match(home,/onSubmit=\{login\}/);
 assert.match(home,/onSubmit=\{reset\}/);
 assert.match(home,/onSubmit=\{updatePassword\}/);
 assert.match(home,/ProfessionalAuth/);
 assert.match(auth,/w1-auth-screen/);
 assert.match(file('app/layout.jsx'),/brand-auth\.css/);
});

test('MIT license matches the public README and W1 Capital copyright',()=>{
 assert.match(file('LICENSE'),/MIT License[\s\S]*Copyright \(c\) 2026 W1 Capital/);
 assert.match(file('README.md'),/MIT License/);
 assert.doesNotMatch(file('README.md'),/não constitui, por si só, autorização para reprodução/i);
});
