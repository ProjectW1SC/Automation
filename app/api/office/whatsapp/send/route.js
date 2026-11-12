import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {canReplyWhatsApp} from '../../../../../lib/office-core.mjs';
import {metaReplyIsApproved,validMetaPhone} from '../../../../../lib/whatsapp-guard.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
export async function POST(request){
 try{
  const {db,user}=await officeAuth(request);
  const p=await request.json();
  if(!metaReplyIsApproved(p))throw Object.assign(Error('Envio exige texto válido e confirmação manual.'),{status:400});
  const phone=validMetaPhone(p.phone);
  if(!phone)throw Object.assign(Error('Número de WhatsApp inválido.'),{status:400});
  const key=process.env.WHATSAPP_ACCESS_TOKEN,phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  if(!key||!phoneId||!process.env.WHATSAPP_APP_SECRET)throw Object.assign(Error('WhatsApp oficial ainda não foi configurado na Vercel.'),{status:503});
  // Mensagem livre somente dentro da janela de atendimento iniciada pelo cliente.
  const inbound=await db.from('office_whatsapp_messages').select('received_at')
   .eq('phone',phone).eq('direction','inbound').order('received_at',{ascending:false}).limit(1);
  if(inbound.error)throw Object.assign(Error('Não foi possível confirmar a conversa.'),{status:503});
  if(!inbound.data?.length||!canReplyWhatsApp(inbound.data[0].received_at))
   throw Object.assign(Error('Fora da janela de 24 horas: aguarde nova mensagem do cliente ou utilize template Meta aprovado.'),{status:403});
  const version=/^v\d+\.\d+$/.test(process.env.WHATSAPP_GRAPH_VERSION||'')?process.env.WHATSAPP_GRAPH_VERSION:'v25.0';
  const url='https://graph.facebook.com/'+version+'/'+encodeURIComponent(phoneId)+'/messages';
  const sent=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'text',text:{preview_url:false,body:p.text.trim()}}),
   signal:AbortSignal.timeout(15000),cache:'no-store'});
  const raw=await sent.text();if(!sent.ok)throw Object.assign(Error('WhatsApp recusou o envio (HTTP '+sent.status+').'),{status:503});
  let payload;try{payload=JSON.parse(raw)}catch{throw Error('WhatsApp não confirmou o identificador do envio. Confira o painel da Meta antes de reenviar.')}
  const messageId=payload?.messages?.[0]?.id;
  if(typeof messageId!=='string'||!messageId)throw Error('WhatsApp não retornou confirmação de mensagem. Confira o painel antes de reenviar.');
  const saved=await db.from('office_whatsapp_messages').insert({
   owner_id:user.id,provider_message_id:messageId,phone,direction:'outbound',
   body:p.text.trim(),status:'sent',reviewed_by:user.id,provider_status:'accepted',received_at:new Date().toISOString()
  });
  return officeJson({ok:true,messageId,warning:saved.error?'Enviado pela Meta, mas o registro no CRM falhou. Não envie novamente sem conferir.':null});
 }catch(e){return safeOfficeError(e)}
}
