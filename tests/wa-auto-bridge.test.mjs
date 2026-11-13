import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{bridgeConfig,waAutoOperation}from '../lib/wa-auto-bridge.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const uidA='550e8400-e29b-41d4-a716-446655440000',uidB='550e8400-e29b-41d4-a716-446655440001';
const env={WA_AUTO_URL:'https://example.onrender.com',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example'};
const success=body=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,userScoped:true,...body})});
test('WhatsApp requires an explicitly configured public server and never assumes a shared number',async()=>{
 assert.equal(bridgeConfig({}).configured,false);
 assert.equal(bridgeConfig({WA_AUTO_URL:'https://example.onrender.com'}).configured,false);
 assert.equal(bridgeConfig({WA_AUTO_URL:'http://localhost:3000',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'a'}).configured,false);
 const result=await waAutoOperation('status',uidA,{},{});assert.equal(result.connected,false);
});
test('independent Supabase sessions yield independent phone and QR code status',async()=>{
 const seen=[];
 const request=async(_url,init)=>{seen.push(init.headers);const first=init.headers.Authorization==='Bearer jwt-first';return success({connection:{status:'qr',qr:first?'qr-A':'qr-B',account:first?{phone:'5511999991111'}:{phone:'5521999992222'}}});};
 const a=await waAutoOperation('status',uidA,{},env,request,'jwt-first');
 const b=await waAutoOperation('status',uidB,{},env,request,'jwt-second');
 assert.equal(a.connection.qr,'qr-A');assert.equal(b.connection.qr,'qr-B');
 assert.equal(a.connection.account.phone,'5511999991111');assert.equal(b.connection.account.phone,'5521999992222');
 assert.equal(seen[0].Authorization,'Bearer jwt-first');assert.equal(seen[1].Authorization,'Bearer jwt-second');
 assert.ok(!('x-lexis-user-id' in seen[0]));assert.ok(!('x-wa-integration-token' in seen[0]));
});
test('WhatsApp rejects missing JWT and a non-user-scoped upstream service',async()=>{
 await assert.rejects(waAutoOperation('status',uidA,{},env,async()=>{throw Error('request not authorized')}),/Sessão do CRM ausente/);
 await assert.rejects(waAutoOperation('status',uidA,{},env,async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,connection:{status:'ready'}})}),'jwt'),/isolamento individual/);
});
test('send requires explicit confirmation and never claims delivery',async()=>{
 await assert.rejects(waAutoOperation('send',uidA,{to:'5511999999999',message:'Oi',approved:false},env,async()=>{throw Error('invalid')} ,'jwt'),/Confirme/);
 let count=0;const r=await waAutoOperation('send',uidA,{to:'5511999999999',message:'Ola',approved:true},env,async()=>{count++;return {ok:true,status:201,text:async()=>JSON.stringify({ok:true,userScoped:true,messageId:'id-1'})}},'jwt');
 assert.equal(count,1);assert.equal(r.accepted,true);assert.equal(r.delivered,false);
 assert.doesNotMatch(read('app/api/office/whatsapp/send/route.js'),/graph.facebook.com/);
});
test('only the authenticated CRM identity is passed to WA.Auto routes',()=>{
 for(const p of ['app/api/office/whatsapp/bridge/route.js','app/api/office/whatsapp/send/route.js','app/api/office/whatsapp/status/route.js'])assert.match(read(p),/officeAuth\(request\)/);
 assert.match(read('app/whatsapp/page.jsx'),/key=\{session.user.id\}/);
 assert.match(read('components/wa-auto-inbox.jsx'),/connection\.account\?\.phone/);
});
