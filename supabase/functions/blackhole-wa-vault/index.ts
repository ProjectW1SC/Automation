import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
function serviceKey(){
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 if(raw){try{const o=JSON.parse(raw);if(typeof o?.default==="string")return o.default;
  const first=Object.values(o).find(x=>typeof x==="string");if(typeof first==="string")return first}catch{}}
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
async function sha256(value:string){
 const dig=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(dig)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function equal(a:string,b:string){
 if(a.length!==b.length)return false;let d=0;
 for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);
 return d===0;
}
Deno.serve(async request=>{
 try{
  const key=serviceKey(),url=Deno.env.get("SUPABASE_URL")||"";
  if(!key||!url)return json({ok:false,error:"Cofre indisponível"},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=String(request.headers.get("x-blackhole-wa-bridge")||"").trim();
  if(!/^[a-fA-F0-9]{64}$/.test(token))return json({ok:false,error:"Não autorizado"},401);
  const check=await db.from("office_wa_bridge_guard").select("token_sha256,active").eq("name","primary").maybeSingle();
  if(check.error||!check.data?.active||!equal(await sha256(token),String(check.data?.token_sha256||"")))return json({ok:false,error:"Não autorizado"},401);
  if(request.method==="GET"){
   const r=await db.from("office_wa_encrypted_vault").select("sealed,updated_at").eq("name","primary").maybeSingle();
   if(r.error)throw r.error;
   return json({ok:true,sealed:r.data?.sealed||null,updated_at:r.data?.updated_at||null});
  }
  if(request.method!=="POST")return json({ok:false,error:"Método inválido"},405);
  const size=Number(request.headers.get("content-length")||0);
  if(size>4600000)return json({ok:false,error:"Payload grande demais"},413);
  const raw=await request.text();if(raw.length>4600000)return json({ok:false,error:"Payload grande demais"},413);
  const payload=JSON.parse(raw);
  if(payload?.op==="save"){
   const sealed=String(payload.sealed||"");
   if(!/^[A-Za-z0-9._-]{40,4500000}$/.test(sealed))return json({ok:false,error:"Cofre inválido"},400);
   const w=await db.from("office_wa_encrypted_vault").upsert({name:"primary",sealed,updated_at:new Date().toISOString()},{onConflict:"name"});
   if(w.error)throw w.error;
   return json({ok:true,saved:true});
  }
  if(payload?.op==="inbound"){
   const ownerId=String(payload.owner_id||"");
   const phone=String(payload.phone||"").replace(/\D/g,"");
   const id=String(payload.provider_id||"").slice(0,120);
   const body=String(payload.body||"").trim().slice(0,4000);
   if(!/^[0-9a-f-]{36}$/i.test(ownerId)||!/^55\d{10,11}$/.test(phone)||!id||!body)return json({ok:false,error:"Evento inválido"},400);
   // Owner must have an enabled office membership or be the designated admin.
   const m=await db.from("crm_memberships").select("user_id").eq("user_id",ownerId).eq("enabled",true).maybeSingle();
   let authorized=!!m.data;
   if(!authorized){
    const user=await db.auth.admin.getUserById(ownerId);
    authorized=String(user.data?.user?.email||"").toLowerCase()==="intermedioesenegociacoes@gmail.com";
   }
   if(!authorized)return json({ok:false,error:"Usuário não autorizado"},403);
   const w=await db.from("office_whatsapp_messages").upsert({
    owner_id:ownerId,phone,direction:"inbound",body,provider_message_id:"blackhole-wa:"+id,
    received_at:new Date().toISOString(),status:"received",provider_status:"inbound"
   },{onConflict:"provider_message_id",ignoreDuplicates:true});
   if(w.error)throw w.error;
   return json({ok:true,accepted:true});
  }
  return json({ok:false,error:"Operação não suportada"},400);
 }catch(e){return json({ok:false,error:String(e instanceof Error?e.message:"Falha no cofre").slice(0,160)},502)}
});
