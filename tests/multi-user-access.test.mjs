import test from 'node:test';
import assert from 'node:assert/strict';
import {signInWithPassword,sendRecovery,ADMIN_EMAIL} from '../lib/login.mjs';
import {checkCrmAccess} from '../lib/crm-access.mjs';

test('login aceita o e-mail de um segundo usuário e preserva o administrador original',async()=>{
 const calls=[];
 const auth={signInWithPassword:async input=>{calls.push(input);return {data:{session:{user:{email:input.email}}},error:null}}};
 await signInWithPassword(auth,'senha de teste 123','outro@exemplo.com');
 await signInWithPassword(auth,'senha de teste 123');
 assert.equal(calls[0].email,'outro@exemplo.com');
 assert.equal(calls[1].email,ADMIN_EMAIL);
});

test('recuperação usa o e-mail escolhido na tela de entrada',async()=>{
 let email;
 const auth={resetPasswordForEmail:async value=>{email=value;return {error:null}}};
 await sendRecovery(auth,'https://projectw1sc-crm.vercel.app','outro@exemplo.com');
 assert.equal(email,'outro@exemplo.com');
});

test('carteira compartilhada depende de usuário realmente autorizado',async()=>{
 let queries=0;
 const db={from:table=>{assert.equal(table,'crm_memberships');queries++;return {
 select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{enabled:true,role:'admin'},error:null})})})})
 }}};
 assert.equal(await checkCrmAccess(db,{id:'id-admin',email:ADMIN_EMAIL}),true);
 assert.equal(queries,0);
 assert.equal(await checkCrmAccess(db,{id:'id-other',email:'outro@exemplo.com'}),true);
 assert.equal(queries,1);
 assert.equal(await checkCrmAccess(null,{id:'x',email:'outro@exemplo.com'}),false);
 assert.equal(await checkCrmAccess(db,null),false);
});

test('membro desativado, ausente ou com falha no banco não obtém acesso',async()=>{
 const makeDb=result=>({from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>result})})})})});
 assert.equal(await checkCrmAccess(makeDb({data:null,error:null}),{id:'1',email:'x@y.com'}),false);
 assert.equal(await checkCrmAccess(makeDb({data:{enabled:false,role:'admin'},error:null}),{id:'1',email:'x@y.com'}),false);
 assert.equal(await checkCrmAccess(makeDb({data:null,error:{message:'offline'}}),{id:'1',email:'x@y.com'}),false);
});
