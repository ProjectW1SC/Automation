import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveChats,archiveMessages,mergeChats,mergeMessages,messageState} from '../lib/wa-auto-archive.mjs';
const owner='550e8400-e29b-41d4-a716-446655440000';
test('chat and message snapshots are sanitized and idempotent for the same jid/id',()=>{
 const rows=archiveChats([{jid:'5511999998888@s.whatsapp.net',name:'Ana',last_message:'Olá'}],owner);
 assert.equal(rows.length,1);
 assert.equal(rows[0].owner_id,owner);
 assert.equal(archiveChats([{jid:'https://invalid'}],owner).length,0);
 const msgs=archiveMessages([{id:'abc',chat_jid:rows[0].jid,content:'Oi',timestamp:'2026-11-12T13:00:00Z',is_from_me:true,ack:2},
 {id:'abc',chat_jid:rows[0].jid,content:'duplicado'}],owner);
 assert.equal(msgs.length,1);assert.equal(msgs[0].ack,2);
});
test('cached messages remain readable when the WA.Auto network returns nothing',()=>{
 const saved=[{id:'a',content:'Recebida no celular',is_from_me:false,timestamp:'2026-11-12T13:00:00Z'}];
 assert.equal(mergeMessages(saved,[])[0].content,'Recebida no celular');
 const result=mergeMessages(saved,[{id:'a',content:'',ack:2}]);
 assert.equal(result[0].content,'Recebida no celular');
});
test('delivery states do not claim delivered before WhatsApp confirms it',()=>{
 assert.match(messageState({is_from_me:true,ack:0}),/não confirmada/);
 assert.equal(messageState({is_from_me:true,ack:1}),'Enviada');
 assert.equal(messageState({is_from_me:true,ack:2}),'Entregue');
 assert.equal(messageState({is_from_me:true,ack:3}),'Lida no WhatsApp');
});
test('cached chat text and remote metadata merge without discarding prior history',()=>{
 const old=[{jid:'5511999998888@s.whatsapp.net',name:'Contato',last_message:'Oi',last_message_at:'2026-11-12T13:00:00Z'}];
 const result=mergeChats(old,[{jid:old[0].jid,name:'',last_message:'',last_message_at:null}]);
 assert.equal(result[0].last_message,'Oi');assert.equal(result[0].name,'Contato');
});
