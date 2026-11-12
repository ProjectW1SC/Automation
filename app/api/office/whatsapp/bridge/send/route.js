import {officeAuth,officeJson,safeOfficeError} from '../../../../../../lib/office-server.mjs';
import {brazilWhatsappPhone} from '../../../../../../lib/blackhole-whatsapp-web.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=35;
export async function POST(request){
 try{
  const {db,user}=await officeAuth(request),p=await request.json();
  if(p?.approved!==true)throw Object.assign(Error('Confirme a revisão e o envio da mensagem.'),{status:400});
  const phone=brazilWhatsappPhone(p?.phone),body=String(p?.text||'').trim();
  if(body.length<1||body.length>1000)throw Object.assign(Error('A mensagem deve ter de 1 a 1.000 caracteres.'),{status:400});
  const base=String(process.env.BLACKHOLE_WA_WORKER_URL||'').trim().replace(/\/+$/,'');
  const token=String(process.env.BLACKHOLE_WA_BRIDGE_TOKEN||'').trim();
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base)||!/^[a-f0-9]{64}$/i.test(token))
   throw Object.assign(Error('Worker de WhatsApp QR não configurado.'),{status:503});
  const response=await fetch(base+'/api/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({phone,text:body,approved:true}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(25000)});
  const raw=await response.text();let result;try{result=JSON.parse(raw)}catch{throw Object.assign(Error('O serviço não retornou confirmação válida.'),{status:502})}
  if(!response.ok||!result.ok||!result.accepted||!result.messageId)
   throw Object.assign(Error(result.error||'O WhatsApp não aceitou a mensagem.'),{status:response.status===429?429:503});
  const saved=await db.from('office_whatsapp_messages').insert({
   owner_id:user.id,provider_message_id:'blackhole-wa:'+String(result.messageId).slice(0,120),
   phone,direction:'outbound',body,status:'accepted',reviewed_by:user.id,provider_status:'accepted',
   received_at:new Date().toISOString()
  });
  return officeJson({ok:true,accepted:true,delivered:false,messageId:result.messageId,
   warning:saved.error?'O WhatsApp aceitou o envio, mas o registro no CRM falhou. Confira antes de tentar novamente.':null});
 }catch(e){return safeOfficeError(e)}
}
