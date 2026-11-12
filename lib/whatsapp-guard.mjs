import {createHmac,timingSafeEqual} from 'node:crypto';
export function signMetaBody(body,secret){
 if(typeof body!=='string'||!secret)throw new Error('Segredo e conteúdo obrigatórios.');
 return 'sha256='+createHmac('sha256',secret).update(body,'utf8').digest('hex');
}
export function verifyMetaBody(body,signature,secret){
 if(typeof signature!=='string'||!/^sha256=[0-9a-f]{64}$/.test(signature)||!secret)return false;
 const expected=Buffer.from(signMetaBody(body,secret));
 const provided=Buffer.from(signature);
 return expected.length===provided.length&&timingSafeEqual(expected,provided);
}
export function validMetaPhone(value){
 const normalized=String(value||'').replace(/\D/g,'');
 return /^\d{10,15}$/.test(normalized)?normalized:null;
}
export function metaReplyIsApproved(input){
 return input?.approved===true&&typeof input?.text==='string'&&input.text.trim().length>0&&input.text.length<=1000;
}
