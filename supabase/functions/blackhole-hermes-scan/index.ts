import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {validatePublicDataJudResponse,currentPublicKey} from "./official-datajud-response.mjs";
import { buildScheduledReview, formatCnj, normalizeDataJudSnapshot, normalizeDjenSnapshot, resolveCourtAlias, selectScheduledCases } from "./core.mjs";

const PUBLIC_DATAJUD_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
function serviceKey(){
 const raw=Deno.env.get("SUPABASE_SECRET_KEYS");
 if(raw){try{const map=JSON.parse(raw);if(typeof map?.default==="string")return map.default;
  const first=Object.values(map).find(x=>typeof x==="string");if(typeof first==="string")return first}catch{}}
 return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
async function sha256(value:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function safeEqual(a:string,b:string){
 if(a.length!==b.length)return false;let diff=0;
 for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
function brazilToday(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
async function fetchJson(url:string,init:RequestInit={}){
 const response=await fetch(url,{...init,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(url.includes('datajud.cnj.jus.br')?29000:21000)});
 const raw=await response.text();
 if(!response.ok)throw Object.assign(new Error("Fonte oficial respondeu HTTP "+response.status),{status:response.status});
 if(raw.length>2_400_000||raw.trimStart().startsWith("<"))throw new Error("Fonte oficial retornou conteúdo não verificável.");
 try{return JSON.parse(raw)}catch{throw new Error("Fonte oficial não retornou JSON válido.")}
}
function djenUrl(number:string,today:string){
 const start=new Date(Date.parse(today+"T12:00:00Z")-29*86400000).toISOString().slice(0,10);
 const q=new URLSearchParams({numeroProcesso:number.replace(/\D/g,""),dataDisponibilizacaoInicio:start,
  dataDisponibilizacaoFim:today,pagina:"1",itensPorPagina:"50"});
 return "https://comunicaapi.pje.jus.br/api/v1/comunicacao?"+q.toString();
}
async function fetchDataJud(number:string,checkedAt:string){
 const alias=resolveCourtAlias(number),digits=number.replace(/\D/g,"");
 const url="https://api-publica.datajud.cnj.jus.br/api_publica_"+alias+"/_search";
 const payload=await fetchJson(url,{method:"POST",headers:{Authorization:"APIKey "+currentPublicKey(Deno.env.get("DATAJUD_API_KEY"),PUBLIC_DATAJUD_KEY),
  "Content-Type":"application/json",Accept:"application/json"},
  body:JSON.stringify({size:5,query:{match:{numeroProcesso:digits}}})});
 validatePublicDataJudResponse(payload);
 return normalizeDataJudSnapshot(payload,number,checkedAt);
}
async function fetchDjen(number:string,today:string,checkedAt:string){
 const payload=await fetchJson(djenUrl(number,today),{method:"GET",headers:{Accept:"application/json"}});
 return normalizeDjenSnapshot(payload,number,checkedAt);
}
function sourceStatus(result:any,source:string){
 if(result?.ok===true)return {source,status:"confirmed",found:!!result.found,checked_at:result.checkedAt||null,
  count:Array.isArray(result.items)?result.items.length:0,error:null};
 const status=Number(result?.status);
 const error=String(result?.error||"Fonte indisponível");
 return {source,status:status===403?"blocked_403":status===429?"rate_limited_429":result?.cooldown?"cooldown":
  /timeout|timed\s*out|tempo esgotado|abort(?:ed)?/i.test(error)?"timeout":"unavailable",found:null,checked_at:null,count:null,error:error.slice(0,220)};
}
async function callSource(db:any,actorId:string,number:string,source:"datajud"|"djen",today:string){
 const {data:pause,error:pauseError}=await db.from("office_source_cooldowns").select("status,retry_after").eq("source",source).maybeSingle();
 if(pauseError)throw new Error("Não foi possível verificar o limite global da fonte.");
 if(pause&&Date.parse(pause.retry_after)>Date.now())return {ok:false,status:pause.status,cooldown:true,
  error:source.toUpperCase()+" em pausa global até "+pause.retry_after};
 const checkedAt=new Date().toISOString();
 try{
  const result=source==="datajud"?await fetchDataJud(number,checkedAt):await fetchDjen(number,today,checkedAt);
  await db.from("office_source_cooldowns").delete().eq("source",source);
  await db.from("office_official_backoff").delete().eq("actor_id",actorId).in("process_number",[number,"*"]).eq("source",source);
  return result;
 }catch(e){
  const status=Number((e as any)?.status)||0,failedAt=new Date(),duration=status===403?20*60*1000:status===429?15*60*1000:0;
  if(duration){
   const retryAfter=new Date(failedAt.getTime()+duration).toISOString();
   await db.from("office_source_cooldowns").upsert({source,status,failed_at:failedAt.toISOString(),retry_after:retryAfter},{onConflict:"source"});
   await db.from("office_official_backoff").upsert([number,"*"].map(process_number=>({
    actor_id:actorId,process_number,source,status,failed_at:failedAt.toISOString(),retry_after:retryAfter
   })),{onConflict:"actor_id,process_number,source"});
  }
  return {ok:false,status,error:String((e as any)?.message||"Consulta não confirmada").slice(0,240)};
 }
}
async function verifyToken(db:any,token:string){
 if(token.length<32)return false;
 const {data,error}=await db.from("office_cron_guard").select("token_sha256").eq("name","hermes").maybeSingle();
 if(error||!data?.token_sha256)return false;
 return safeEqual(await sha256(token),String(data.token_sha256));
}
async function runOne(db:any,row:any,today:string){
 const number=formatCnj(row.process_number),actorId=row.actor_id,checkedAt=new Date().toISOString();
 const [datajud,djen]=await Promise.all([
  callSource(db,actorId,number,"datajud",today),
  callSource(db,actorId,number,"djen",today)
 ]);
 const djStatus=sourceStatus(datajud,"DataJud"),dnStatus=sourceStatus(djen,"DJEN");
 const sourceStatusRecord={datajud:djStatus,djen:dnStatus,complete:djStatus.status==="confirmed"&&dnStatus.status==="confirmed",
  partial:!(djStatus.status==="confirmed"&&dnStatus.status==="confirmed"),
  confirmedSources:Number(djStatus.status==="confirmed")+Number(dnStatus.status==="confirmed")};
 const snapshots:any[]=[];
 if(datajud?.ok===true)snapshots.push({actor_id:actorId,process_number:number,source:"datajud",query_key:"latest",
  checked_at:datajud.checkedAt||checkedAt,found:!!datajud.found,payload:{...datajud,items:(datajud.items||[]).slice(0,120)}});
 if(djen?.ok===true)snapshots.push({actor_id:actorId,process_number:number,source:"djen",query_key:"default:default",
  checked_at:djen.checkedAt||checkedAt,found:!!djen.found,payload:{...djen,items:(djen.items||[]).slice(0,120)}});
 let persisted=true,saveError:string|null=null;
 if(snapshots.length){
  const saved=await db.from("crm_judicial_snapshots").upsert(snapshots,{onConflict:"actor_id,process_number,source,query_key"});
  if(saved.error){persisted=false;saveError=String(saved.error.message||"Falha ao salvar snapshots").slice(0,250)}
 }
 const review=buildScheduledReview(snapshots.map(s=>({process_number:number,source:s.source==="datajud"?"DataJud":"DJEN",
  checked_at:s.checked_at,payload:s.payload})),today);
 if(sourceStatusRecord.confirmedSources===0){
  review.returnReason="As duas fontes não foram confirmadas nesta varredura. Não há como afirmar ausência de movimentações. As consultas anteriores permanecem em histórico.";
 }else if(sourceStatusRecord.confirmedSources===1){
  review.returnReason="Uma fonte oficial confirmou a consulta; a outra permanece indisponível. "+review.returnReason;
 }
 const scan=await db.from("office_scan_runs").insert({actor_id:actorId,process_number:number,trigger_mode:"scheduled",
  source_status:sourceStatusRecord,review:{...review,persisted,saveError}});
 if(scan.error)throw new Error("Falha ao registrar histórico do scanner: "+scan.error.message);
 const agentStatus=!persisted?"partial":sourceStatusRecord.confirmedSources===2?"ready":
  sourceStatusRecord.confirmedSources===1?"partial":"failed";
 await db.from("office_agent_runs").insert({owner_id:actorId,agent:"hermes",
  task:"Varredura automática DataJud + DJEN · "+number,mode:"scheduled",status:agentStatus,
  result:{processNumber:number,sourceStatus:sourceStatusRecord,review,persisted,saveError},
  sources:[djStatus,dnStatus],external_actions:0});
 return {process_number:number,actor_id:actorId,sourceStatus:sourceStatusRecord,
  events:review.confirmedOfficialEvents,hearings:review.hearings.length,verdicts:review.verdicts.length,persisted,saveError};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-blackhole-cron-token,apikey","Access-Control-Allow-Methods":"POST,OPTIONS"}});
 if(req.method!=="POST")return json({ok:false,error:"Método não permitido."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL")||"",key=serviceKey();
  if(!url||!key)return json({ok:false,error:"Credencial administrativa do projeto não está disponível no ambiente seguro."},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const token=req.headers.get("x-blackhole-cron-token")||"";
  if(!await verifyToken(db,token))return json({ok:false,error:"Agendador não autorizado."},401);
  const body=await req.json().catch(()=>({}));
  // Protected one-off source probe: only a verified internal cron token can invoke it.
  // It never exposes a process identifier, a party, court movements, or API credentials.
  if(body?.diagnostic===true){
   const today=brazilToday(),checkedAt=new Date().toISOString();
   const {data:rows,error:caseErr}=await db.from("office_cases").select("process_number")
     .not("process_number","is",null).limit(30);
   if(caseErr)return json({ok:false,error:"Base de processos indisponível"},503);
   const row=(rows||[]).find(r=>{try{return !!resolveCourtAlias(formatCnj(r.process_number))}catch{return false}});
   if(!row)return json({ok:true,region:Deno.env.get("SB_REGION")||"unknown",tested:false,
     reason:"Nenhum processo público elegível foi encontrado no cadastro."});
   const number=formatCnj(row.process_number);
   const {data:pauses,error:cooldownErr}=await db.from("office_source_cooldowns").select("source,status,retry_after")
     .in("source",["datajud","djen"]);
   if(cooldownErr)return json({ok:false,error:"Controle de pausas indisponível"},503);
   async function checkSource(source:"datajud"|"djen"){
    const pause=(pauses||[]).find(x=>x.source===source&&Date.parse(x.retry_after)>Date.now());
    if(pause)return {state:"cooldown",httpStatus:Number(pause.status)||null,source,verified:false};
    const began=Date.now();
    try{
     const result=source==="datajud"?await fetchDataJud(number,checkedAt):await fetchDjen(number,today,checkedAt);
     return {state:result?.ok===true?"verified_response":"unverified_response",source,
       verified:result?.ok===true,found:result?.ok===true?!!result.found:null,
       items:result?.ok===true?Math.min(1500,(result.items||[]).length):null,
       latencyMs:Date.now()-began};
    }catch(err){
     const status=Number((err as any)?.status)||null;
     return {state:status===403?"blocked_403":status===429?"rate_limited_429":
       /AbortError|TimeoutError|timed out|timeout|signal has been aborted/i.test(String((err as any)?.message||""))
       ?"timeout":"unavailable",source,verified:false,httpStatus:status,
       error:String((err as any)?.message||"Fonte não respondeu").slice(0,170),latencyMs:Date.now()-began};
    }
   }
   const [datajud,djen]=await Promise.all([checkSource("datajud"),checkSource("djen")]);
   return json({ok:true,region:Deno.env.get("SB_REGION")||"unknown",tested:true,checkedAt,
     sourceStatus:{datajud,djen},notice:"Diagnóstico restrito: nenhuma informação processual ou segredo foi retornado."});
  }
  const limit=Math.max(1,Math.min(2,Number(body?.limit)||1)),today=brazilToday();
  const cutoff=new Date(Date.now()-18*60*60*1000).toISOString();
  const [office,crm,recent]=await Promise.all([
   db.from("office_cases").select("owner_id,process_number,title,status,next_review,updated_at")
    .not("process_number","is",null).order("next_review",{ascending:true,nullsFirst:false}).limit(800),
   db.from("crm_processes").select("actor_id,process_number,updated_at")
    .not("process_number","is",null).order("updated_at",{ascending:true}).limit(800),
   db.from("office_scan_runs").select("actor_id,process_number,checked_at").gte("checked_at",cutoff).limit(2000)
  ]);
  const errors=[office.error,crm.error,recent.error].filter(Boolean);
  if(errors.length)return json({ok:false,error:"Não foi possível montar a fila privada de processos.",details:errors.map(x=>x.message).slice(0,3)},503);
  // Targeted one-time rescan is authorized only by the existing verified cron token.
  // Normal scheduling retains its anti-flood interval; no user-provided identity is trusted.
  let forcedCnj:string|null=null;
  if(body?.targetCnj!==undefined){
   if(typeof body.targetCnj!=="string")return json({ok:false,error:"CNJ alvo inválido."},400);
   try{forcedCnj=formatCnj(body.targetCnj)}catch{return json({ok:false,error:"CNJ alvo inválido."},400)}
  }
  const officeRows=forcedCnj?(office.data||[]).filter(x=>{try{return formatCnj(x.process_number)===forcedCnj}catch{return false}}):office.data||[];
  const crmRows=forcedCnj?(crm.data||[]).filter(x=>{try{return formatCnj(x.process_number)===forcedCnj}catch{return false}}):crm.data||[];
  if(forcedCnj&&!officeRows.length&&!crmRows.length)
   return json({ok:false,error:"CNJ não pertence à carteira autorizada."},404);
  const candidates=selectScheduledCases({officeCases:officeRows,crmProcesses:crmRows,
   recentRuns:forcedCnj?[]:recent.data||[],today,limit:forcedCnj?1:limit,now:new Date().toISOString()});
  if(!candidates.length)return json({ok:true,state:"idle",processed:0,eligible:0,checkedAt:new Date().toISOString(),
   notice:"Nenhum CNJ elegível nesta rodada. Nenhum dado de processo foi alterado."});
  const results=[];
  for(const row of candidates){
   try{results.push(await runOne(db,row,today))}
   catch(e){results.push({process_number:row.process_number,actor_id:row.actor_id,error:String((e as any)?.message||"Falha no Hermes").slice(0,240)})}
  }
  return json({ok:true,state:"completed",processed:results.length,results,checkedAt:new Date().toISOString(),
   notice:"Varredura oficial em segundo plano. Não altera prazos/retornos, não envia mensagens e exige revisão humana."});
 }catch(e){return json({ok:false,error:String((e as any)?.message||"Falha no scanner Hermes").slice(0,350)},500)}
});
