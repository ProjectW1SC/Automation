import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {signMetaBody,verifyMetaBody,validMetaPhone,metaReplyIsApproved} from '../lib/whatsapp-guard.mjs';
import {canReplyWhatsApp} from '../lib/office-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Meta webhook valida HMAC do corpo original e rejeita assinatura ausente',()=>{
 const body=JSON.stringify({entry:[1]}),sig=signMetaBody(body,'mysecret');
 assert.ok(verifyMetaBody(body,sig,'mysecret'));
 assert.equal(verifyMetaBody(body+' ',sig,'mysecret'),false);
 assert.equal(verifyMetaBody(body,'sha256=fake','mysecret'),false);
});
test('apenas números E164 plausíveis; envio requer confirmação explícita',()=>{
 assert.equal(validMetaPhone('5511999999999'),'5511999999999');
 assert.equal(validMetaPhone('1234'),null);
 assert.equal(metaReplyIsApproved({text:'Olá',approved:true}),true);
 assert.equal(metaReplyIsApproved({text:'Olá'}),false);
 assert.equal(canReplyWhatsApp('2026-11-10T09:00:00Z',new Date('2026-11-12T09:00:00Z')),false);
});
test('rotas não expõem serviço privado no navegador e não enviam antes da aprovação',()=>{
 const hook=read('app/api/office/whatsapp/webhook/route.js');
 const send=read('app/api/office/whatsapp/send/route.js');
 assert.match(hook,/verifyMetaBody/);
 assert.match(hook,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(send,/metaReplyIsApproved/);
 assert.match(send,/canReplyWhatsApp/);
 assert.doesNotMatch(read('components/office-console.jsx'),/SUPABASE_SERVICE_ROLE_KEY/);
});
