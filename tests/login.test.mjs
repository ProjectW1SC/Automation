import test from 'node:test';
import assert from 'node:assert/strict';
import {ADMIN_EMAIL,signInWithPassword,sendRecovery,changePassword,interpretLoginError} from '../lib/login.mjs';

test('uses the single verified ProjectW1SC email, without an editable email typo', async () => {
  let payload;
  const auth = {signInWithPassword: async x => {payload=x;return {data:{session:{user:{email:ADMIN_EMAIL}}},error:null}}};
  const response=await signInWithPassword(auth, 'senha de teste suficientemente longa');
  assert.equal(ADMIN_EMAIL, 'intermedioesenegociacoes@gmail.com');
  assert.deepEqual(payload, {email: ADMIN_EMAIL,password:'senha de teste suficientemente longa'});
  assert.ok(response.session);
});

test('password sign in does not send any magic-link request',async () => {
  let magic=0;const auth={signInWithOtp:()=>{magic++;throw new Error('unexpected OTP')},signInWithPassword:async ()=>({data:{},error:{message:'Invalid login credentials'}})};
  await assert.rejects(()=>signInWithPassword(auth,'senha de teste suficientemente longa'), /credenciais|senha/i);
  assert.equal(magic,0);
});

test('recovery link points back to the correct CRM origin',async()=>{
  let req;
  const auth={resetPasswordForEmail:async(email,opts)=>{req={email,opts};return {error:null}}};
  await sendRecovery(auth,'https://projectw1sc-crm.vercel.app');
  assert.equal(req.email,ADMIN_EMAIL);
  assert.equal(req.opts.redirectTo,'https://projectw1sc-crm.vercel.app/');
});

test('password change uses Supabase Auth and never stores the password in client config',async()=>{
  let opts;
  const auth={updateUser:async payload=>{opts=payload;return {error:null,data:{user:{id:'test'}}}}};
  await changePassword(auth,'nova senha para teste');
  assert.deepEqual(opts,{password:'nova senha para teste'});
});

test('rejects empty or too short passwords locally',async()=>{
  const auth={signInWithPassword:async()=>{throw Error('unexpected')}};
  await assert.rejects(()=>signInWithPassword(auth,''),/senha/i);
  await assert.rejects(()=>signInWithPassword(auth,'abc'),/senha/i);
});

test('Supabase 400 invalid_credentials receives actionable message',()=> {
  const error={status:400,code:'invalid_credentials',message:'Invalid login credentials'};
  assert.match(interpretLoginError(error),/senha incorret/i);
});

test('Supabase 429 mail quota is identified instead of recommending immediate retries',async()=>{
  const {isRecoveryRateLimit,canRequestRecovery,RECOVERY_COOLDOWN_MS}=await import('../lib/login.mjs');
  const error={status:429,code:'over_email_send_rate_limit',message:'email rate limit exceeded'};
  assert.equal(isRecoveryRateLimit(error),true);
  assert.match(interpretLoginError(error),/limite|e-mails/i);
  const t=Date.UTC(2026,10,9,13,5);
  assert.equal(canRequestRecovery(t+RECOVERY_COOLDOWN_MS,t+1000),false);
  assert.equal(canRequestRecovery(t+RECOVERY_COOLDOWN_MS,t+RECOVERY_COOLDOWN_MS),true);
});

test('a recuperação preserva o código 429 e não mascara o bloqueio do Supabase',async()=>{
  const {isRecoveryRateLimit}=await import('../lib/login.mjs');
  const auth={resetPasswordForEmail:async()=>({error:{status:429,code:'over_email_send_rate_limit',message:'email rate limit exceeded'}})};
  await assert.rejects(async()=>{
    try{await sendRecovery(auth,'https://projectw1sc-crm.vercel.app')}
    catch(error){assert.equal(isRecoveryRateLimit(error),true);throw error}
  },/limite|e-mails/i);
});
