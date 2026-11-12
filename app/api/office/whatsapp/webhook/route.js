import {createClient} from '@supabase/supabase-js';
import {signMetaBody,verifyMetaBody,validMetaPhone} from '../../../../../lib/whatsapp-guard.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=30;
const plain=(str,status=200)=>new Response(str,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
export async function GET(request){
 const params=new URL(request.url).searchParams;
 const expected=process.env.WHATSAPP_VERIFY_TOKEN;
 if(!expected)return plain('WhatsApp indisponível.',503);
 if(params.get('hub.mode')!=='subscribe'||params.get('hub.verify_token')!==expected)return plain('Verificação recusada.',403);
 const challenge=params.get('hub.challenge');
 return /^\d{1,200}$/.test(challenge||'')?plain(challenge):plain('Desafio inválido.',400);
}
export async function POST(request){
 const secret=process.env.WHATSAPP_APP_SECRET,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,expectedPhone=process.env.WHATSAPP_PHONE_NUMBER_ID;
 if(!secret||!serviceKey||!url||!expectedPhone)return plain('Conexão não configurada.',503);
 const body=await request.text();
 if(body.length>800000)return plain('Excesso de dados.',413);
 if(!verifyMetaBody(body,request.headers.get('x-hub-signature-256'),secret))return plain('Assinatura inválida.',401);
 let data;try{data=JSON.parse(body)}catch{return plain('JSON inválido.',400)}
 const records=[];
 for(const entry of Array.isArray(data.entry)?data.entry.slice(0,10):[]){
  for(const change of Array.isArray(entry.changes)?entry.changes.slice(0,10):[]){
   const value=change.value||{};
   if(String(value.metadata?.phone_number_id||'')!==expectedPhone)continue;
   for(const m of Array.isArray(value.messages)?value.messages.slice(0,100):[]){
    const phone=validMetaPhone(m.from);
    if(!phone||typeof m.id!=='string'||m.id.length>200)continue;
    const person=(value.contacts||[]).find(x=>x.wa_id===m.from);
    const name=String(person?.profile?.name||'').slice(0,120);
    const text=m.type==='text'?String(m.text?.body||'').slice(0,4000):'[Mídia recebida: conferir no canal oficial]';
    const received_at=/^\d{10,13}$/.test(String(m.timestamp||''))?new Date(Number(m.timestamp)*1000).toISOString():new Date().toISOString();
    records.push({owner_id:null,phone,direction:'inbound',display_name:name,body:text,
     provider_message_id:m.id,received_at,status:'received',provider_status:'webhook'});
   }
  }
 }
 if(!records.length)return plain('OK');
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.from('office_whatsapp_messages').upsert(records.slice(0,100),{onConflict:'provider_message_id',ignoreDuplicates:true});
 if(error)return plain('Armazenamento temporariamente indisponível.',503);
 return plain('OK');
}
