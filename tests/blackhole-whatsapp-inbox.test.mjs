import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WhatsApp abre caixa nativa no CRM e usa QR interno, sem redirecionar para outra aba',()=>{
 const page=read('app/whatsapp/page.jsx'),ui=read('components/office-whatsapp.jsx');
 assert.match(page,/OfficeWhatsApp/);assert.match(ui,/wa-inbox-layout/);assert.match(ui,/bridge\/connect/);
 assert.match(ui,/status\.qr/);assert.match(ui,/approved:true/);assert.match(ui,/Revisei o texto/);
 assert.doesNotMatch(ui,/window\.open|web\.whatsapp\.com|wa\.me/);
});
test('envio pelo worker exige sessão, aprovação explícita e grava status sem afirmar entrega',()=>{
 const route=read('app/api/office/whatsapp/bridge/send/route.js');
 assert.match(route,/officeAuth/);assert.match(route,/p\?\.approved!==true/);
 assert.match(route,/delivered:false/);assert.match(route,/status:'accepted'/);
});
test('conectar WhatsApp e consultar status são endpoints separados',()=>{
 assert.match(read('app/api/office/whatsapp/bridge/connect/route.js'),/officeAuth/);
 assert.match(read('app/api/office/whatsapp/bridge/status/route.js'),/export async function GET/);
 assert.doesNotMatch(read('app/api/office/whatsapp/bridge/status/route.js'),/export async function POST/);
});
