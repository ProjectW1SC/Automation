import {consultBothOfficialSources} from '../../../../lib/combined-judicial-history.mjs';
import {snapshotIsFresh,snapshotQueryKey,shrinkOfficialResult} from '../../../../lib/judicial-triage.mjs';
import {consultJudicialWithFallback,officialBackoffDuration,officialBackoffActive} from '../../../../lib/judicial-source-recovery.mjs';
import {checkCrmAccess} from '../../../../lib/crm-access.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {formatProcessNumber,resolveCourtAlias,normalizeDataJud,normalizeDjen,buildDjenUrl,dataJudSnapshotIsFromCourt} from '../../../../lib/processos-oficiais.mjs';
import {validatePublicDataJudResponse,currentPublicKey} from '../../../../lib/official-datajud-response.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const PUBLIC_DATAJUD_KEY='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='; // Public key documented by CNJ
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store, private'}});
async function fetchJson(url,opts={},timeoutMs=21000){
 const response=await fetch(url,{...opts,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(timeoutMs)});
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
 const key=currentPublicKey(process.env.DATAJUD_API_KEY,PUBLIC_DATAJUD_KEY);
 const payload=await fetchJson(url,{method:'POST',headers:{Authorization:'APIKey '+key,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({size:1,query:{match:{numeroProcesso:digits}}})},23000);
 validatePublicDataJudResponse(payload);
 const match=payload.hits.hits.find(h=>h?._source&&String(h._source.numeroProcesso||'').replace(/\D/g,'')===digits)?._source;
 const parsed=normalizeDataJud(match,number);
 return {ok:true,source:'DataJud',found:parsed.found,items:parsed.movements,meta:parsed.meta,
  checkedAt:new Date().toISOString(),court:alias.toUpperCase(),
  notice:parsed.found?'Movimentações disponíveis no índice público do CNJ.':'CNJ não localizado no índice público do tribunal consultado.'};
}
async function regionalOfficial(kind,number,query,userJwt){
 // Calls the same protected Supabase Edge region that returned real DJEN publications.
 // Authorization is the actual CRM Supabase JWT, verified again by the Edge function.
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'');
 const apiKey=String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||!userJwt||!apiKey)
  throw Object.assign(new Error('Consulta regional segura não está configurada.'),{status:503});
 const endpoint=base+'/functions/v1/infinitum-judicial-query?forceFunctionRegion=sa-east-1';
 let response;
 try{
  response=await fetch(endpoint,{method:'POST',cache:'no-store',redirect:'error',
   headers:{Authorization:'Bearer '+userJwt,apikey:apiKey,'x-region':'sa-east-1',
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({source:kind,number,start:query.get('inicio')||undefined,
    end:query.get('fim')||undefined,page:Number(query.get('pagina')||1)}),
   signal:AbortSignal.timeout(30000)});
 }catch(e){throw Object.assign(new Error('Nó judicial de São Paulo não respondeu: '+String(e?.message||'falha').slice(0,120)),{status:503})}
 const raw=await response.text();
 if(!raw||raw.length>2400000||raw.trimStart().startsWith('<'))
  throw Object.assign(new Error('Nó regional não retornou JSON verificável.'),{status:502});
 let result;try{result=JSON.parse(raw)}catch{throw Object.assign(new Error('Nó regional retornou JSON inválido.'),{status:502})}
 if(!response.ok||result?.ok!==true){
  const status=Number(result?.status)||response.status||503;
  throw Object.assign(new Error('Consulta CNJ em São Paulo: '+String(result?.error||'HTTP '+status).slice(0,170)),{status,code:result?.code});
 }
 if(result?.authenticated!==true||result?.region!=='sa-east-1'||!Array.isArray(result?.items)
   ||result.source!==(kind==='djen'?'DJEN':'DataJud'))
  throw Object.assign(new Error('Fonte ou autenticação do resultado regional não verificável.'),{status:502});
 return result;
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
  limited:items.length>=50,hasMore:items.length>=50,page:Number(page)};
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
  // No modo compartilhado, um processo da empresa Lexis já é um registro
  // autorizado, mesmo sem cópia duplicada nas tabelas legadas do Infinitum.
  // Nunca consultar a carteira de outra empresa, inclusive para superadmins.
  const shared=process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1';
  let empresaId=null;
  if(shared){
   const profile=await db.from('usuarios').select('empresa_id').eq('auth_user_id',user.id).limit(2);
   if(profile.error||profile.data?.length!==1||!profile.data[0].empresa_id)
    return json({ok:false,error:'Não foi possível validar a organização do login LexisPredict.'},403);
   empresaId=profile.data[0].empresa_id;
  }
  const [registry,activities,officeCase,lexisCase]=await Promise.all([
   db.from('crm_processes').select('id').eq('process_number',number).limit(1),
   db.from('crm_completed_activities').select('id').eq('actor_id',user.id).eq('process_number',number).is('deleted_at',null).limit(1),
   db.from('office_cases').select('id').eq('process_number',number).limit(1),
   shared?db.from('processos').select('id').eq('empresa_id',empresaId).eq('protocolo_ref',number).limit(1):
    Promise.resolve({data:[],error:null})
  ]);
  if(registry.error||activities.error||officeCase.error||lexisCase.error)
   return json({ok:false,error:'Não foi possível verificar o cadastro privado do CNJ.'},503);
  if(!registry.data?.length&&!activities.data?.length&&!officeCase.data?.length&&!lexisCase.data?.length)
   return json({ok:false,error:'Este CNJ não consta da carteira autorizada da empresa.'},403);
  async function consultOne(kind){
   const queryKey=snapshotQueryKey(kind,params);
   const {data:rawCached,error:cacheError}=await db.from('crm_judicial_snapshots').select('payload,checked_at')
    .eq('actor_id',user.id).eq('process_number',number).eq('source',kind).eq('query_key',queryKey).maybeSingle();
   if(cacheError)throw Object.assign(new Error('Não foi possível ler histórico oficial autorizado.'),{status:503});
   const cached=kind==='datajud'&&rawCached?.payload&&!dataJudSnapshotIsFromCourt(rawCached.payload,number)?null:rawCached;
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
   if(paused){
    const historical=await db.from('crm_judicial_snapshots').select('payload,checked_at').eq('actor_id',user.id).eq('process_number',number).eq('source',kind).order('checked_at',{ascending:false}).limit(1).maybeSingle();
    if(!historical.error&&historical.data?.payload&&(kind!=='datajud'||dataJudSnapshotIsFromCourt(historical.data.payload,number)))return {...historical.data.payload,stale:true,fromCache:true,checkedAt:historical.data.checked_at,notice:'Histórico anteriormente confirmado ('+historical.data.checked_at+'). Fonte '+kind.toUpperCase()+' permanece bloqueada: NÃO é uma atualização atual.'};
   }
   if(paused)throw Object.assign(new Error(kind.toUpperCase()+' permanece em pausa após resposta HTTP '+paused.status+
     '. Próxima tentativa após '+paused.retry_after+'. Não haverá nova requisição à fonte bloqueada.'),{status:paused.status});
   let result;
   try{
    if(kind==='djen'){
     // Prefer the verified Brazilian Edge exit. Fall back to Vercel only on infrastructure errors.
     try{result=await regionalOfficial('djen',number,params,token)}
     catch(e){
      if([401,403,429].includes(Number(e?.status)))throw e;
      result=await djen(number,params);
     }
    }else{
     // Original Vercel DataJud path can work for some courts. A single regional
     // retry is allowed on network/timeout (never after HTTP 429).
     try{result=await datajud(number)}
     catch(e){
      if(Number(e?.status)===429)throw e;
      result=await regionalOfficial('datajud',number,params,token);
     }
    }
   }
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
    // Só recuperar snapshot verificado para a mesma janela/página e usuário.
    // Fonte bloqueada não converte cache em uma nova consulta.
    if(cached?.payload?.ok===true){
     return {...cached.payload,stale:true,fromCache:true,checkedAt:cached.checked_at,
      sourceError:String(error?.message||'Fonte indisponível').slice(0,240),
      notice:'Consulta atual não confirmada. Exibindo apenas histórico oficial de '+cached.checked_at+'.'};
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
  const upstreamStatus=Number(error?.status);
  const timeout=error?.name==='TimeoutError'||error?.name==='AbortError';
  const status=[403,429,502,503,504].includes(upstreamStatus)?upstreamStatus:timeout?504:badInput?400:502;
  return json({ok:false,error:message,code:error?.code||null},status);
 }
}
