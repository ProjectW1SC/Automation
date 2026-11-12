import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
export async function POST(request){
 try{
  const {db,user}=await officeAuth(request),data=await request.json();
  const to=String(data.to||data.phone||'').replace(/\D/g,'');
  const message=String(data.message||data.text||'').trim();
  const result=await waAutoOperation('send',user.id,{...data,to,message});
  if(result.accepted&&result.messageId){
   const saved=await db.from('office_whatsapp_messages').insert({
    owner_id:user.id,client_id:data.client_id||null,provider_message_id:'wa-auto:'+String(result.messageId).slice(0,120),
    phone:to,direction:'outbound',body:message,status:'accepted',provider_status:'accepted',
    reviewed_by:user.id,received_at:new Date().toISOString()
   });
   if(saved.error)return officeJson({...result,warning:'WA.Auto aceitou a mensagem, mas o histórico do CRM não foi gravado. Não reenvie sem conferir.'});
  }
  return officeJson(result);
 }catch(e){return safeOfficeError(e)}
}
