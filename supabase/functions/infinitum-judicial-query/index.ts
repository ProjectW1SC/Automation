import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";
import {formatCnj,resolveCourtAlias,normalizeDataJudSnapshot,normalizeDjenSnapshot} from "./core.mjs";
import {validatePublicDataJudResponse,currentPublicKey} from "./official-datajud-response.mjs";

// Only the signed-in ProjectW1SC user can query a CNJ already in their RLS-visible portfolio.
// No service-role key, signed shared header, or user ID sent from a browser is trusted.
const PUBLIC_DATAJUD_KEY="cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json","Cache-Control":"private,no-store"}});
const fail=(message:string,status:number,code:string)=>Object.assign(new Error(message),{status,code});
const isDate=(value:string)=>/^20\d{2}-\d\d-\d\d$/.test(value)&&new Date(value+"T12:00:00Z").toISOString().startsWith(value);
function djenUrl(number:string,body:any){
 const now=new Date().toISOString().slice(0,10);
 const start=String(body.start||new Date(Date.now()-29*86400000).toISOString().slice(0,10));
 const end=String(body.end||now);
 if(!isDate(start)||!isDate(end)||start>end)throw fail("Intervalo de datas inválido.",400,"bad_dates");
 const days=(Date.parse(end+"T12:00:00Z")-Date.parse(start+"T12:00:00Z"))/86400000;
 if(days>31)throw fail("DJEN: intervalo superior a 31 dias.",400,"date_range");
 const page=Number(body.page||1);
 if(!Number.isInteger(page)||page<1||page>100)throw fail("Página DJEN inválida.",400,"bad_page");
 const qs=new URLSearchParams({numeroProcesso:number.replace(/\D/g,""),dataDisponibilizacaoInicio:start,
  dataDisponibilizacaoFim:end,pagina:String(page),itensPorPagina:"50"});
 return "https://comunicaapi.pje.jus.br/api/v1/comunicacao?"+qs.toString();
}
async function requestOfficial(url:string,opts:RequestInit,source:string){
 const signal=AbortSignal.timeout(source==="datajud"?29000:18000);
 let response:Response;
 try{response=await fetch(url,{...opts,cache:"no-store",redirect:"error",signal})}
 catch(e){throw fail(String((e as Error)?.name||"")?.includes("Timeout")?"O serviço oficial esgotou o tempo.":"Falha de rede com a fonte oficial.",
  503,"upstream_network")}
 if(response.status===429)throw fail("CNJ limitou requisições (HTTP 429).",429,"rate_limited");
 if(response.status===403)throw fail("Fonte oficial recusou a rede (HTTP 403).",403,"blocked");
 if(!response.ok)throw fail("Fonte oficial respondeu HTTP "+response.status,502,"upstream_http");
 const raw=await response.text();
 if(!raw.trim()||raw.length>2400000||raw.trimStart().startsWith("<"))throw fail("Resposta oficial inválida ou HTML de bloqueio.",502,"invalid_response");
 try{return JSON.parse(raw)}catch{throw fail("Fonte oficial não retornou JSON válido.",502,"invalid_json")}
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return json({ok:false,error:"Método não permitido."},405);
 try{
  const base=Deno.env.get("SUPABASE_URL")||"";
  const key=req.headers.get("apikey")||"";
  const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!base||!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(base)||!key||!jwt)
   return json({ok:false,error:"Sessão CRM não identificada."},401);
  const db=createClient(base,key,{global:{headers:{Authorization:"Bearer "+jwt}},
   auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(jwt);
  if(authError||!user)return json({ok:false,error:"Sessão CRM inválida."},401);
  const permission=await db.rpc("office_has_access");
  if(permission.error||permission.data!==true)return json({ok:false,error:"Operador não autorizado."},403);
  const payload=await req.json().catch(()=>({}));
  const kind=String(payload.source||"");
  if(kind!=="djen"&&kind!=="datajud")return json({ok:false,error:"Fonte judicial inválida."},400);
  let number:string;try{number=formatCnj(payload.number)}catch{return json({ok:false,error:"CNJ inválido."},400)}
  // Match authorization rules in the Vercel route; RLS permits only the signed-in operator's rows.
  const [c,a,o]=await Promise.all([
   db.from("office_cases").select("id").eq("process_number",number).limit(1),
   db.from("crm_processes").select("id").eq("process_number",number).limit(1),
   db.from("crm_completed_activities").select("id").eq("actor_id",user.id)
     .eq("process_number",number).is("deleted_at",null).limit(1)
  ]);
  if(c.error||a.error||o.error)return json({ok:false,error:"Não foi possível validar o cadastro autorizado do processo."},503);
  if(!c.data?.length&&!a.data?.length&&!o.data?.length)return json({ok:false,error:"Processo não encontrado na carteira autorizada."},403);
  const region=Deno.env.get("SB_REGION")||"unknown";
  if(region!=="sa-east-1")return json({ok:false,error:"Consulta regional não ocorreu em São Paulo.",region},503);
  const started=Date.now(),checkedAt=new Date().toISOString();
  let result:any;
  if(kind==="djen"){
   const url=djenUrl(number,payload);
   const data=await requestOfficial(url,{method:"GET",headers:{Accept:"application/json"}},"djen");
   result=normalizeDjenSnapshot(data,number,checkedAt);
   const rows=Array.isArray(data)?data:Array.isArray(data?.items)?data.items:Array.isArray(data?.content)?data.content:[];
   result={...result,hasMore:rows.length>=50,limited:rows.length>=50,page:Number(payload.page||1)};
  }else{
   const alias=resolveCourtAlias(number),digits=number.replace(/\D/g,"");
   const url="https://api-publica.datajud.cnj.jus.br/api_publica_"+alias+"/_search";
   const credential=currentPublicKey(Deno.env.get("DATAJUD_API_KEY"),PUBLIC_DATAJUD_KEY);
   const data=validatePublicDataJudResponse(await requestOfficial(url,{method:"POST",
    headers:{Authorization:"APIKey "+credential,"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify({size:1,query:{match:{numeroProcesso:digits}}})},"datajud"));
   result=normalizeDataJudSnapshot(data,number,checkedAt);
  }
  return json({...result,via:"supabase-edge-sa-east-1",region,latencyMs:Date.now()-started,authenticated:true});
 }catch(e){
  const status=Number((e as any)?.status)||503;
  return json({ok:false,source:"CNJ",status,code:String((e as any)?.code||"source_error"),
   error:String((e as any)?.message||"Fonte indisponível").slice(0,220),region:Deno.env.get("SB_REGION")||"unknown"},status);
 }
});
