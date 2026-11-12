import {consultBothOfficialSources} from '../../../../lib/combined-judicial-history.mjs';
import {snapshotIsFresh,snapshotQueryKey,shrinkOfficialResult} from '../../../../lib/judicial-triage.mjs';
import {consultJudicialWithFallback,officialBackoffDuration,officialBackoffActive} from '../../../../lib/judicial-source-recovery.mjs';
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
  if(response.status===429)throw Object.assign(new Error('Fonte oficial limitou as consultas (HTTP 429). Tente novamente mais tarde.'),{status:429});
  if(response.status===403)throw Object.assign(new Error('A fonte oficial bloqueou esta rede (HTTP 403).'),{status:403});
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
  body:JSON.stringify({size:2,query:{bool:{should:[{term:{numeroProcesso:digits}},{match:{numeroProcesso:digits}}],minimum_should_match:1}}})});
 if(!Array.isArray(payload?.hits?.hits))throw new Error('O DataJud não retornou um resultado processual reconhecível.');
 const match=payload.hits.hits.find(h=>h?._source&&String(h._source.numeroProcesso||'').replace(/\D/g,'')===digits)?._source;
 const parsed=normalizeDataJud(match,number);
 return {ok:true,source:'DataJud',found:parsed.found,items:parsed.movements,meta:parsed.meta,
  checkedAt:new Date().toISOString(),court:alias.toUpperCase(),
  notice:parsed.found?'Movimentações disponíveis no índice público do CNJ.':'CNJ não localizado no índice público do tribunal consultado.'};
}
async function djen(number,query){
 const start=query.get('inicio')||undefined,end=query.get('fim')||undefined,page=query.get('pagina')||1;
 const url=buildDjenUrl(number,{start,end,page});
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
  limited:items.length>=100,hasMore:items.length>=100,page:Number(page)};
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
  if(!['datajud','djen','auto'].includes(source))return json({ok:false,error:'Escolha DataJud, DJEN ou consulta automática.'},400);
  // Official lookups are only allowed for CNJs already saved privately in this user's CRM.
  const [registry,activities,officeCase]=await Promise.all([
   db.from('crm_processes').select('id').eq('process_number',number).limit(1),
   db.from('crm_completed_activities').select('id').eq('actor_id',user.id).eq('process_number',number).is('deleted_at',null).limit(1),
   db.from('office_cases').select('id').eq('process_number',number).limit(1)
  ]);
  if(registry.error||activities.error||officeCase.error)return json({ok:false,error:'Não foi possível verificar o cadastro privado do CNJ.'},503);
  if(!registry.data?.length&&!activities.data?.length&&!officeCase.data?.length)
   return json({ok:false,error:'Cadastre o CNJ no escritório antes de consultar a fonte oficial.'},403);
  async function consultOne(kind){
   const queryKey=snapshotQueryKey(kind,params);
   const {data:cached,error:cacheError}=await db.from('crm_judicial_snapshots').select('payload,checked_at')
    .eq('actor_id',user.id).eq('process_number',number).eq('source',kind).eq('query_key',queryKey).maybeSingle();
   if(cacheError)throw Object.assign(new Error('Não foi possível ler histórico oficial autorizado.'),{status:503});
   if(params.get('forcar')!=='1'&&snapshotIsFresh(cached,kind)){
    return {...cached.payload,fromCache:true,notice:(cached.payload.notice||'')+
     ' · Consulta oficial anterior reutilizada para evitar requisições repetidas.'};
   }
   const [localPause,globalPause,platformPause]=await Promise.all([
    db.from('office_official_backoff').select('status,retry_after')
     .eq('actor_id',user.id).eq('process_number',number).eq('source',kind).maybeSingle(),
    db.from('office_official_backoff').select('status,retry_after')
     .eq('actor_id',user.id).eq('process_number','*').eq('source',kind).maybeSingle(),
    db.from('office_source_cooldowns').select('status,retry_after').eq('source',kind).maybeSingle()
   ]);
   if(localPause.error||globalPause.error||platformPause.error)throw Object.assign(new Error('Controle de indisponibilidade judicial não pôde ser consultado.'),{status:503});
   const paused=[localPause.data,globalPause.data,platformPause.data].find(entry=>officialBackoffActive(entry));
   if(paused&&cached?.payload)return {...cached.payload,stale:true,fromCache:true,notice:'Fonte oficial temporariamente bloqueada. Exibindo consulta anterior ('+cached.checked_at+'), sem atualização em tempo real.'};
   if(paused)throw Object.assign(new Error(kind.toUpperCase()+' permanece em pausa após resposta HTTP '+paused.status+
     '. Próxima tentativa após '+paused.retry_after+'. Não haverá nova requisição à fonte bloqueada.'),{status:paused.status});
   let result;
   try{result=kind==='datajud'?await datajud(number):await djen(number,params)}
   catch(error){
    const duration=officialBackoffDuration(error?.status);
    if(duration){
     const failedAt=new Date(),retryAfter=new Date(failedAt.getTime()+duration).toISOString();
     // Cooldown por usuário/processo e por fonte da infraestrutura, compartilhado com o agendador.
     await Promise.all([
      db.from('office_official_backoff').upsert([number,'*'].map(process_number=>({
       actor_id:user.id,process_number,source:kind,status:error.status,
       failed_at:failedAt.toISOString(),retry_after:retryAfter
      })),{onConflict:'actor_id,process_number,source'}),
      db.rpc('record_office_source_cooldown',{p_source:kind,p_status:error.status})
     ]);
    }
    throw error;
   }
   // A resposta foi confirmada pelo serviço oficial; não registrar falhas como "sem movimentações".
   await db.from('office_official_backoff').delete().eq('actor_id',user.id)
    .in('process_number',[number,'*']).eq('source',kind);
   const reduced=shrinkOfficialResult(result);
   const {error:saveError}=await db.from('crm_judicial_snapshots').upsert({
    actor_id:user.id,process_number:number,source:kind,query_key:queryKey,
    checked_at:result.checkedAt,found:!!result.found,payload:reduced
   },{onConflict:'actor_id,process_number,source,query_key'});
   return {...result,snapshotSaved:!saveError,snapshotError:saveError?
    'A consulta foi concluída, mas o histórico não pôde ser armazenado.':undefined};
  }
  if(source==='auto'){
   const result=await consultBothOfficialSources({djen:()=>consultOne('djen'),datajud:()=>consultOne('datajud')});
   return json(result,result.ok?200:502);
  }
  return json(await consultOne(source));
 }catch(error){
  const message=error?.name==='TimeoutError'||error?.name==='AbortError'?
    'Consulta à fonte oficial excedeu o tempo limite. Tente novamente.':
    error?.message||'Falha ao consultar a fonte oficial.';
  const badInput=/CNJ|Data inicial/.test(message);
  return json({ok:false,error:message},badInput?400:502);
 }
}
