import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.58.0";
// Supabase Auth Admin API. Nenhuma credencial privada chega ao navegador.
// Somente Superadmin autenticado pode ativar/redefinir o convidado da empresa demo.
const ORIGIN="https://agentinfinitum.vercel.app";
const ORG="b889c08e-7378-47f1-9830-a03f87abb18f";
const EMAIL="convidado.infinitum@example.com";
const STUB="11111111-1111-4111-8111-111111111111";
const headers={"Content-Type":"application/json","Cache-Control":"no-store, private",
 "Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
function secretKey(){
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS")||"";
 if(raw){try{const obj=JSON.parse(raw);if(typeof obj.default==="string")return obj.default;
  const key=Object.values(obj).find(x=>typeof x==="string");if(typeof key==="string")return key}catch{}}
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
function randomPassword(){
 const bytes=crypto.getRandomValues(new Uint8Array(24));
 return "InfDemo-"+Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(request.method!=="POST")return respond({ok:false,error:"Método não permitido"},405);
 if(request.headers.get("origin")&&request.headers.get("origin")!==ORIGIN)
  return respond({ok:false,error:"Origem não autorizada"},403);
 const jwt=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 if(!jwt)return respond({ok:false,error:"Sessão administrativa obrigatória."},401);
 const base=Deno.env.get("SUPABASE_URL")||"",key=secretKey();
 if(!base||!key)return respond({ok:false,error:"Credenciais de administração do Supabase indisponíveis."},503);
 try{
  const body=await request.json().catch(()=>({}));
  if(body?.confirm!=="ATIVAR_DEMONSTRACAO")return respond({ok:false,error:"Confirmação administrativa obrigatória."},400);
  const admin=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(jwt);
  if(authError||!user)return respond({ok:false,error:"Sessão inválida."},403);
  const {data:actor,error:actorError}=await admin.from("usuarios")
   .select("cargo,role,empresa_id").eq("auth_user_id",user.id).maybeSingle();
  if(actorError||!actor||!/superadmin/i.test(String(actor.cargo)+" "+String(actor.role))||actor.empresa_id===ORG)
   return respond({ok:false,error:"Somente o Superadmin do ambiente real pode criar contas de demonstração."},403);
  const {data:company,error:companyError}=await admin.from("empresas").select("branding").eq("id",ORG).maybeSingle();
  if(companyError||company?.branding?.infinitum_demo!==true)
   return respond({ok:false,error:"Empresa demonstrativa não validada."},409);
  const {data:profiles,error:profileError}=await admin.from("usuarios")
   .select("id,auth_user_id,email,empresa_id").eq("empresa_id",ORG).eq("email",EMAIL).limit(2);
  if(profileError||profiles?.length!==1)
   return respond({ok:false,error:"Perfil de demonstração ausente ou ambíguo."},409);
  const {data:listed,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:200});
  if(listError)return respond({ok:false,error:"Não foi possível verificar usuários existentes."},503);
  const matches=(listed.users||[]).filter(x=>x.email?.toLowerCase()===EMAIL);
  if(matches.length>1)return respond({ok:false,error:"Cadastro duplicado no Supabase Auth."},409);
  const current=matches[0];
  if(current&&current.app_metadata?.demo_account!==true)
   return respond({ok:false,error:"O e-mail demonstrativo já pertence a uma conta não reconhecida como demo."},409);
  if(current&&![STUB,current.id].includes(String(profiles[0].auth_user_id)))
   return respond({ok:false,error:"O perfil demonstrativo já pertence a outra identidade."},409);
  const password=randomPassword();
  let uid:string;
  if(current){
   const {data,error}=await admin.auth.admin.updateUserById(current.id,{password,
    app_metadata:{...current.app_metadata,demo_account:true}});
   if(error||!data.user?.id)return respond({ok:false,error:"Não foi possível renovar a senha do convidado."},503);
   uid=data.user.id;
  }else{
   const {data,error}=await admin.auth.admin.createUser({
    email:EMAIL,password,email_confirm:true,app_metadata:{demo_account:true}});
   if(error||!data.user?.id)return respond({ok:false,error:"Supabase Auth não criou o convidado: "+String(error?.message||"falha").slice(0,100)},503);
   uid=data.user.id;
  }
  // Reatribuição exclusivamente dos registros da empresa fictícia.
  const ownerColumns=[
   ["office_clients","owner_id"],["office_cases","owner_id"],["office_deadlines","owner_id"],
   ["office_documents","owner_id"],["office_workflow_cards","owner_id"],
   ["office_whatsapp_messages","owner_id"],["office_agent_runs","owner_id"],
   ["office_scan_runs","actor_id"],["crm_judicial_snapshots","actor_id"],
   ["crm_leads","owner_id"],["crm_completed_activities","actor_id"],
   ["tarefas_realizadas","responsavel_auth_user_id"],
   ["crm_tarefas","created_by"],["crm_tarefas","assignee_id"],["crm_atividades","created_by"]
  ] as const;
  for(const [table,column] of ownerColumns){
   const {error}=await admin.from(table).update({[column]:uid})
    .eq("empresa_id",ORG).eq(column,STUB);
   if(error)return respond({ok:false,error:"Reatribuição de dados demo falhou em "+table+"; use a ativação novamente."},503);
  }
  const {data:profile,error:updateError}=await admin.from("usuarios")
   .update({auth_user_id:uid}).eq("id",profiles[0].id).eq("empresa_id",ORG)
   .select("auth_user_id").maybeSingle();
  if(updateError||profile?.auth_user_id!==uid)
   return respond({ok:false,error:"Vínculo de convidado incompleto; reative para reconciliar."},503);
  return respond({ok:true,demo:true,email:EMAIL,password,
   notice:"Conta criada ou renovada exclusivamente para dados fictícios. Guarde a senha e compartilhe-a somente com quem deve acessar a demonstração."});
 }catch(e){return respond({ok:false,error:"Falha na ativação demonstrativa: "+String((e as Error)?.message||"erro").slice(0,100)},503)}
});
