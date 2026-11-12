import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('WhatsApp interno substitui a pagina Meta/WhatsApp Web',()=>{
 assert.match(file('app/whatsapp/page.jsx'),/WaAutoInbox/);
 const ui=file('components/wa-auto-inbox.jsx');
 for(const name of ['connect','pair','logout','chats','messages','send','Gerar código','Conectar por QR','CAIXA DE ENTRADA','Enviar'])assert.ok(ui.includes(name),'Falta: '+name);
 assert.doesNotMatch(ui,/graph\.facebook\.com|WhatsApp Business Cloud API/);
});
test('QR gerado no navegador por pacote local e token preservado no servidor',()=>{
 assert.match(file('components/wa-auto-inbox.jsx'),/import\('qrcode'\)/);
 assert.match(file('app/layout.jsx'),/wa-auto-inbox\.css/);
 assert.equal(JSON.parse(file('package.json')).dependencies.qrcode,'1.5.4');
});
test('Integracoes indicam o estado real do WA.Auto',()=>{
 const s=file('components/office-integrations.jsx');
 assert.match(s,/WA.Auto · WhatsApp interno/);
 assert.match(s,/wa\.connected/);
});

test('QR de imagem pronto do Baileys não é recodificado como texto',()=>{const ui=read('components/wa-auto-inbox.jsx');assert.match(ui,/data:image\\/);assert.match(ui,/setQrImage\(String\(connection\.qr\)\)/);assert.match(ui,/4000/);});
