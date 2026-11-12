// Canonicalize WA.Auto records before persisting in the user's own Supabase archive.
const validJid=x=>typeof x==='string'&&x.length<=200&&/^[^\s@]{1,150}@(s\.whatsapp\.net|g\.us|lid|c\.us)$/.test(x);
const iso=x=>{const d=new Date(x||'');return Number.isFinite(d.getTime())?d.toISOString():null};
const limitText=(value,max)=>String(value??'').slice(0,max);
const capped=(rows,n)=>Array.isArray(rows)?rows.slice(0,n):[];
export function archiveChats(rows,ownerId){
 const seen=new Set(),now=new Date().toISOString(),out=[];
 for(const item of capped(rows,100)){
  const jid=String(item?.jid||'').trim();if(!validJid(jid)||seen.has(jid))continue;
  seen.add(jid);
  out.push({owner_id:ownerId,jid,name:limitText(item.name,240),phone:limitText(item.phone,32),
   is_group:!!item.is_group||jid.endsWith('@g.us'),
   last_message:limitText(item.last_message,4000),last_message_at:iso(item.last_message_at),updated_at:now});
 }
 return out;
}
export function archiveMessages(rows,ownerId,jidHint=''){
 const now=new Date().toISOString(),seen=new Set(),out=[];
 for(const item of capped(rows,400)){
  const jid=String(item?.chat_jid||item?.jid||jidHint||'').trim();
  const id=String(item?.provider_message_id||item?.id||'').trim();
  if(!validJid(jid)||!id||id.length>180||seen.has(jid+'|'+id))continue;
  seen.add(jid+'|'+id);
  const level=Number(item.ack),ack=Number.isInteger(level)?Math.max(0,Math.min(3,level)):0;
  out.push({owner_id:ownerId,jid,provider_message_id:id,content:limitText(item.content,4000),
   is_from_me:!!item.is_from_me,media_type:item.media_type?limitText(item.media_type,80):null,
   timestamp:iso(item.timestamp)||now,ack,updated_at:now});
 }
 return out;
}
export function mergeChats(oldRows,newRows){
 const merged=new Map();
 for(const item of [...capped(oldRows,300),...capped(newRows,300)]){
  if(!validJid(item?.jid))continue;
  const old=merged.get(item.jid);
  if(!old){merged.set(item.jid,item);continue}
  const use=item.last_message_at&&(!old.last_message_at||item.last_message_at>=old.last_message_at);
  merged.set(item.jid,{...old,...item,name:item.name||old.name,phone:item.phone||old.phone,
   last_message:use?(item.last_message||old.last_message):old.last_message,
   last_message_at:use?item.last_message_at:old.last_message_at});
 }
 return [...merged.values()].sort((a,b)=>String(b.last_message_at||'').localeCompare(String(a.last_message_at||''))).slice(0,300);
}
export function mergeMessages(oldRows,newRows){
 const merged=new Map();
 for(const item of [...capped(oldRows,400),...capped(newRows,400)]){
  const id=String(item?.id||item?.provider_message_id||'');
  if(!id)continue;
  const prior=merged.get(id);
  if(!prior){merged.set(id,{...item,id});continue}
  merged.set(id,{...prior,...item,id,
    content:String(item.content||prior.content||''),
    ack:Math.max(Number(prior.ack)||0,Number(item.ack)||0),
    timestamp:item.timestamp||prior.timestamp});
 }
 return [...merged.values()].sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||''))).slice(-300);
}
export function messageState(item){
 if(!item?.is_from_me)return '';
 const ack=Number(item?.ack)||0;
 return ack>=3?'Lida no WhatsApp':ack>=2?'Entregue':ack>=1?'Enviada':'Aceita pelo WA.Auto · entrega não confirmada';
}
export function validArchiveJid(jid){return validJid(jid)}
