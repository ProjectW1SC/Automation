import test from'node:test';import assert from'node:assert/strict';import{blackholeWhatsAppWebUrl,brazilWhatsappPhone}from'../lib/blackhole-whatsapp-web.mjs';
test('WhatsApp Web abre apenas telefone brasileiro válido e texto escapado',()=>{
 assert.equal(brazilWhatsappPhone('(11) 99999-1234'),'5511999991234');
 assert.equal(brazilWhatsappPhone('5511999991234'),'5511999991234');
 const url=blackholeWhatsAppWebUrl('11 99999-1234','Olá! Como posso ajudar?');
 const parsed=new URL(url);assert.equal(parsed.origin,'https://web.whatsapp.com');
 assert.equal(parsed.searchParams.get('phone'),'5511999991234');assert.equal(parsed.searchParams.get('text'),'Olá! Como posso ajudar?');
 for(const v of ['abc','123','+44 123 123 123'])assert.throws(()=>brazilWhatsappPhone(v));
});
