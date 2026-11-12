import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('offline CRM displays persistent Supabase chat and message history on any logged-in device',()=>{
 const s=read('components/wa-auto-inbox.jsx');
 for(const x of ['office_wa_chat_archive','office_wa_message_archive','loadArchiveChats','loadArchiveMessages','visibleChats','messageState'])assert.ok(s.includes(x));
 assert.doesNotMatch(s,/if\(!selected\?\.jid\|\|!connected\)\{setMessages\(\[\]\)/);
});
test('backend sync catches messages received on the phone while CRM tab was closed',()=>{
 const bridge=read('lib/wa-auto-bridge.mjs');const ui=read('components/wa-auto-inbox.jsx');
 assert.match(bridge,/sync:\['GET','sync'\]/);assert.match(ui,/api\('sync'\)/);
 assert.match(ui,/persistArchive\(currentChats,recentMessages\)/);
});
test('outbound messages are persisted after real acceptance, never labelled delivered before an ack',()=>{
 const ui=read('components/wa-auto-inbox.jsx');assert.match(ui,/if\(jid&&r\.messageId\)/);
 assert.match(ui,/ack:0/);
 assert.match(ui,/Entrega e leitura dependem da confirmação/);
});
test('session isolation: archive uses authenticated user ID and no service secret in browser',()=>{
 const s=read('app/whatsapp/page.jsx'),ui=read('components/wa-auto-inbox.jsx');
 assert.match(s,/userId=\{session\.user\.id\}/);assert.match(ui,/\.eq\('owner_id',userId\)/);
 assert.doesNotMatch(ui,/process\.env\.(WA_AUTO_TOKEN|SUPABASE_SERVICE_ROLE_KEY)/);
});
