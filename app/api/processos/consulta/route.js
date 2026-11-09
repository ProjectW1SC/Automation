import {checkCrmAccess} from '../../../../lib/crm-access.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {formatProcessNumber,resolveCourtAlias,normalizeDataJud,normalizeDjen,buildDjenUrl} from '../../../../lib/processos-oficiais.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=35;
const PUBLIC_DATAJUD_KEY='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='; // Public key documented by CNJ
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private'}});
async function fetchJson(url,opts={}){
 const response=await fetch(url,{...opts,cache:'no-store',signal:AbortSignal.timeout(14000)});
 const raw=await response.text();
 if(!response.ok){
  if(response.status===429)throw new Error('Fonte oficial limitou as consultas (HTTP 429). Tente novamente mais tarde.');
  if(response.status===403)throw new Error('A fonte oficial bloqueou esta rede (HTTP 403).');
  throw new Error('Fonte oficial indisponível (HTTP '+response.status+').');
 }
 if(raw.trim().startsWith('<'))throw new Error('A fonte oficial retornou HTML ou bloqueio temporário, não dados.');
 if(raw.length>2400000)throw new Error('Resposta da fonte oficial ultrapassou o tamanho permitido.');
 try{return JSON.parse(raw)}catch{throw new Error('A fonte oficial retornou dados inválidos.')}
}
async function datajud(number){
 const alias=resolveCourtAlias(number);
 const url='https://api-publica.datajud.cnj.jus.br/api_publica_'+alias+'/_search';
 const digits=number.replace(/\D/g,'');
 const key=process.env.DATAJUD_API_KEY||PUBLIC_DATAJUD_KEY;
 const payload=await fetchJson(url,{method:'POST',headers:{Authorization:'APIKey '+key,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({size:2,query:{bool:{should:[{match:{numeroProcesso:digits}},{match:{numeroProcesso:number}}],minimum_should_match:1}}})});
 if(!Array.isArray(payload?.hits?.hits))throw new Error('O DataJud não retornou um resultado processual reconhecível.');
 const match=payload.hits.hits.find(h=>h?._source&&String(h._source.numeroProcesso||'').replace(/\D/g,'')===digits)?._source;
 const parsed=normalizeDataJud(match,number);
 return {ok:true,source:'DataJud',found:parsed.found,items:parsed.movements,meta:parsed.meta,
  checkedAt:new Date().toISOString(),court:alias.toUpperCase(),
  notice:parsed.found?'Movimentações disponíveis no índice público do CNJ.':'CNJ não localizado no índice público do tribunal consultado.'};
}
async function djen(number,query){
 const start=query.get('inicio')||undefined,end=query.get('fim')||undefined;
 const url=buildDjenUrl(number,{start,end});
 const response=await fetchJson(url,{method:'GET',headers:{Accept:'application/json'}});
 let items=normalizeDjen(response,number);
 // Some CNJ nodes recognize the masked number only. Retry once on a valid empty list.
 if(items.length===0){
  const alt=new URL(url);alt.searchParams.set('numeroProcesso',number);
  try{const another=await fetchJson(alt.toString(),{method:'GET',headers:{Accept:'application/json'}});items=normalizeDjen(another,number)}
  catch{/* First official response was valid and empty. Preserve it. */}
 }
 return {ok:true,source:'DJEN',found:items.length>0,items,
  checkedAt:new Date().toISOString(),notice:items.length?
  'Publicações localizadas no Diário de Justiça Eletrônico Nacional.':'Nenhuma publicação encontrada para as datas consultadas no DJEN.',
  limited:items.length>=100};
}
export async function GET(request){
 try{
  const authHeader=request.headers.get('authorization')||'';
  const token=authHeader.startsWith('Bearer ')?authHeader.slice(7).trim():'';
  if(!token)return json({ok:false,error:'Entre no CRM para consultar o processo.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({ok:false,error:'Conexão segura do CRM não configurada.'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user||!(await checkCrmAccess(db,user)))
   return json({ok:false,error:'Conta sem permissão para consultar processos neste CRM.'},403);
  const params=new URL(request.url).searchParams;
  const number=formatProcessNumber(params.get('numero'));
  const source=params.get('fonte');
  if(!['datajud','djen'].includes(source))return json({ok:false,error:'Escolha DataJud ou DJEN.'},400);
  // Official lookups are only allowed for CNJs already saved privately in this user's CRM.
  const [registry,activities]=await Promise.all([
   db.from('crm_processes').select('id').eq('process_number',number).limit(1),
   db.from('crm_completed_activities').select('id').eq('actor_id',user.id).eq('process_number',number).is('deleted_at',null).limit(1)
  ]);
  if(registry.error||activities.error)return json({ok:false,error:'Não foi possível verificar o cadastro privado do CNJ.'},503);
  if(!registry.data?.length&&!activities.data?.length)
   return json({ok:false,error:'Salve o número CNJ em Processos ou em Minhas atividades antes da consulta.'},403);
  const result=source==='datajud'?await datajud(number):await djen(number,params);
  return json(result);
 }catch(error){
  const message=error?.name==='TimeoutError'||error?.name==='AbortError'?
    'Consulta à fonte oficial excedeu o tempo limite. Tente novamente.':
    error?.message||'Falha ao consultar a fonte oficial.';
  const badInput=/CNJ|Data inicial/.test(message);
  return json({ok:false,error:message},badInput?400:502);
 }
}
