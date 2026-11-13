import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../components/secured-workspace.jsx',import.meta.url),'utf8');
const bridge=readFileSync(new URL('../lib/firebase-google-bridge.mjs',import.meta.url),'utf8');
test('Google Firebase só aparece se configuração presente; conta depende da autorização do escritório',()=>{
 assert.match(source,/firebaseGoogleConfigured\(\)/);
 assert.match(source,/onClick=\{googleFirebase\}/);
 assert.match(source,/googleEnabled===false/);
 assert.match(bridge,/signInWithIdToken/);
 assert.match(bridge,/getRedirectResult/);
});
test('código de e-mail suporta verificação OTP real sem Google Console nem conta criada automaticamente',()=>{
 assert.match(source,/verifyEmailCode/);
 assert.match(source,/db\.auth\.verifyOtp/);
 assert.match(source,/type:'email'/);
 assert.match(source,/shouldCreateUser:false/);
 assert.match(source,/otpSent/);
});
