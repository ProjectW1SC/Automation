import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('QR proxy exige sessão do CRM, status real e valida destino e HTTPS',()=>{
 const route=load('app/api/office/wa-qr/route.js');
 assert.match(route,/officeAuth\(request\)/);
 assert.match(route,/\.onrender\.com/);
 assert.match(route,/brazilWhatsappPhone/);
 assert.match(route,/action==='connect'/);
 assert.match(route,/action==='send'/);
 assert.match(route,/approved!==true/);
 assert.match(route,/delivered:false/);
 assert.match(route,/data:image\\\/png;base64/);
 assert.doesNotMatch(route,/NEXT_PUBLIC.*BRIDGE_TOKEN/);
});
