import {officeAuth,officeJson,safeOfficeError} from '../../../../lib/office-server.mjs';
import {brazilWhatsappPhone} from '../../../../lib/blackhole-whatsapp-web.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
function workerConfig(){
 const token=String(process.env.BLACKHOLE_WA_BRIDGE_TOKEN||'').trim();
 const raw=String(process.env.BLACKHOLE_WA_BRIDGE_URL||'').trim().replace(/\/+$/,'');
 if(!/^[a-f0-9]{64}$/i.test(token)||!raw)throw Object.assign(Error('WhatsApp QR ainda não foi vinculado ao servidor. O WhatsApp Web manual permanece disponível.'),{status:503});
 let u;try{u=new URL(raw)}catch{throw Object.assign(Error('Endereço do worker de WhatsApp inválido.'),{status:503})}
 if(u.protocol!=='https:'||!u.hostname.endsWith('.onrender.com')||u.username||u.password||u.search||u.hash||u.pathname!=='/')
  throw Object.assign(Error('Servidor WhatsApp QR não autorizado.'),{status:503});
 return {token,base:u.origin};
}
async function callWorker(path,method='GET',body=null){
 const {token,base}=workerConfig();
 const response=await fetch(base+path,{
  method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
  body:body?JSON.stringify(body):undefined,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(17000)
 });
 const raw=await response.text();
 if(raw.length>300000)throw Object.assign(Error('Resposta do WhatsApp grande demais.'),{status:503});
 let data;try{data=JSON.parse(raw)}catch{throw Object.assign(Error('Servidor do WhatsApp não retornou JSON válido.'),{status:503})}
 if(!response.ok||data.ok!==true)throw Object.assign(Error(data.error||'WhatsApp QR indisponível'),{status:[400,401,403,409,429,503].includes(response.status)?response.status:503});
 return data;
}
export async function GET(request){
 try{
  const {user}=await officeAuth(request);
  const d=await callWorker('/api/status');
  if(d.owner_id&&d.owner_id!==user.id)throw Object.assign(Error('Aparelho vinculado a outra conta. Solicite administração da conexão.'),{status:403});
  if(d.qr&&!/^data:image\/png;base64,[A-Za-z0-9+/=]{100,260000}$/.test(d.qr))d.qr=null;
  return officeJson({ok:true,configured:true,provider:'Baileys (não oficial)',status:d.status,connected:d.connected===true,qr:d.qr||null,phone:d.phone||null,error:d.error||null});
 }catch(e){return safeOfficeError(e)}
}
export async function POST(request){
 try{
  const {user}=await officeAuth(request);
  const input=await request.json();
  if(input?.action==='connect'){
   const d=await callWorker('/api/connect','POST',{owner_id:user.id});
   return officeJson({ok:true,status:d.status,connected:d.connected===true,qr:d.qr&&/^data:image\/png;base64,/.test(d.qr)?d.qr:null});
  }
  if(input?.action==='send'){
   if(input?.approved!==true)throw Object.assign(Error('Confirmação expressa do envio é obrigatória.'),{status:403});
   const phone=brazilWhatsappPhone(input.phone);
   const body=String(input.text||'').trim();
   if(!body||body.length>1000)throw Object.assign(Error('Mensagem precisa conter de 1 a 1.000 caracteres.'),{status:400});
   const d=await callWorker('/api/send','POST',{phone,text:body,approved:true,owner_id:user.id});
   return officeJson({ok:true,accepted:d.accepted===true,delivered:false,messageId:String(d.messageId||''),notice:'Mensagem aceita pelo aparelho conectado. Ainda não existe confirmação de entrega nem leitura.'});
  }
  throw Object.assign(Error('Ação inválida para o WhatsApp QR.'),{status:400});
 }catch(e){return safeOfficeError(e)}
}
