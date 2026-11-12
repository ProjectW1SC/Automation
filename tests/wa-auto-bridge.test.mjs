import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bridgeConfig,waAutoOperation} from '../lib/wa-auto-bridge.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const actor='550e8400-e29b-41d4-a716-446655440000';
test('sem token nao inventa sessao WhatsApp conectada',async()=>{
 assert.equal(bridgeConfig({WA_AUTO_URL:'https://wa-auto-cloud.onrender.com'}).configured,false);
 const r=await waAutoOperation('status',actor,{},{});assert.equal(r.connected,false);assert.equal(r.configured,false);
 await assert.rejects(waAutoOperation('send',actor,{to:'5511999999999',message:'Oi',approved:true},{}),/não configurado/i);
});
test('impede SSRF, envio sem confirmacao e ações arbitrarias',async()=>{
 assert.equal(bridgeConfig({WA_AUTO_URL:'http://localhost:3000',WA_AUTO_TOKEN:'x'}).configured,false);
 await assert.rejects(waAutoOperation('delete-all',actor,{},{}),/não permitida/i);
 const env={WA_AUTO_URL:'https://wa-auto-cloud.onrender.com',WA_AUTO_TOKEN:'not-a-real-token'};
 await assert.rejects(waAutoOperation('send',actor,{to:'5511999999999',message:'Oi',approved:false},env,async()=>{throw Error('deveria falhar antes da rede')}),/confirme o envio/i);
});
test('proxy usa apenas identidade verificada do CRM e nao coloca token no browser',async()=>{
 let seen;
 const env={WA_AUTO_URL:'https://wa-auto-cloud.onrender.com',WA_AUTO_TOKEN:'test-only-not-secret'};
 const res=await waAutoOperation('chats',actor,{q:'Paula'},env,async(url,init)=>{seen={url,init};return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,chats:[{jid:'5511999999999@s.whatsapp.net',name:'Paula'}]})}});
 assert.equal(res.chats[0].name,'Paula');
 assert.equal(seen.init.headers['x-lexis-user-id'],actor);
 assert.equal(seen.init.headers.Authorization,'Bearer '+env.WA_AUTO_TOKEN);
 assert.ok(!read('components/wa-auto-inbox.jsx').includes('process.env.WA_AUTO_TOKEN'));
 assert.match(read('app/api/office/whatsapp/bridge/route.js'),/officeAuth/);
});
test('nao diz entregue quando a ponte aceita envio e evita Meta',async()=>{
 const env={WA_AUTO_URL:'https://wa-auto-cloud.onrender.com',WA_AUTO_TOKEN:'test-only-not-secret'};
 let count=0;const response=await waAutoOperation('send',actor,{to:'5511999999999',message:'Ola',approved:true},env,async()=>{count++;return {ok:true,status:201,text:async()=>JSON.stringify({ok:true,messageId:'abc'})}});
 assert.equal(count,1);assert.equal(response.accepted,true);assert.equal(response.delivered,false);
 assert.doesNotMatch(read('app/api/office/whatsapp/send/route.js'),/graph.facebook.com|WHATSAPP_ACCESS_TOKEN/);
});
