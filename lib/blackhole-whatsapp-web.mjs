// Handoff gratuito para o WhatsApp Web: operador controla a sessão e o envio.
export function brazilWhatsappPhone(value){
 const supplied=String(value||'').trim();
 if(/^\+(?!55\b|55\d)/.test(supplied)||/^00\d/.test(supplied))throw Error('Apenas números brasileiros (+55) são aceitos.');
 let digits=supplied.replace(/\D/g,'');
 if(/^\d{10,11}$/.test(digits))digits='55'+digits;
 if(!/^55\d{10,11}$/.test(digits))throw Error('Informe DDD + telefone brasileiro, com 10 ou 11 dígitos.');
 return digits;
}
export function blackholeWhatsAppWebUrl(phone,text=''){
 const digits=brazilWhatsappPhone(phone);
 const message=String(text||'').trim();
 if(message.length>3000)throw Error('Mensagem muito longa (limite: 3.000 caracteres).');
 const url=new URL('https://web.whatsapp.com/send');
 url.searchParams.set('phone',digits);
 if(message)url.searchParams.set('text',message);
 return url.toString();
}
