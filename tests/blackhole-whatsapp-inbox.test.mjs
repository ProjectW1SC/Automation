import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WhatsApp abre caixa nativa no CRM e usa QR interno, sem redirecionar para outra aba',()=>{
 const page=read('app/whatsapp/page.jsx'),ui=read('components/wa-auto-inbox.jsx');
 assert.match(page,/WaAutoInbox/);assert.match(ui,/office-whatsapp/);
 assert.match(read('components/office-whatsapp.jsx'),/wa-inbox-layout/);
 assert.match(read('components/office-whatsapp.jsx'),/connection\?\.qr/);
 assert.match(read('components/office-whatsapp.jsx'),/approved:true/);
 assert.match(read('components/office-whatsapp.jsx'),/Revisei o texto/);
 assert.doesNotMatch(read('components/office-whatsapp.jsx'),/window\.open|web\.whatsapp\.com|wa\.me/);
});
test('envio pelo WA.Auto exige sessão, aprovação explícita e não afirma entrega',()=>{
 const route=read('app/api/office/whatsapp/send/route.js');
 assert.match(route,/officeAuth/);assert.match(route,/waAutoOperation\('send'/);
 assert.match(read('lib/wa-auto-bridge.mjs'),/p\.approved!==true/);
 assert.match(read('lib/wa-auto-bridge.mjs'),/delivered:false/);
 assert.match(route,/status:'accepted'/);
});
test('status e conexão usam a ponte privada WA.Auto existente',()=>{
 assert.match(read('components/office-whatsapp.jsx'),/bridge\?action=status/);
 assert.match(read('components/office-whatsapp.jsx'),/action:'connect'/);
 assert.match(read('app/api/office/whatsapp/bridge/route.js'),/officeAuth/);
});
