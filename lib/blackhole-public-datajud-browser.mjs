import {formatProcessNumber,resolveCourtAlias,normalizeDataJud} from './processos-oficiais.mjs';
import {validatePublicDataJudResponse,currentPublicKey} from './official-datajud-response.mjs';

// Chave pública publicada pelo CNJ; nunca é uma credencial privada do escritório.
const PUBLIC_DATAJUD_KEY='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
const ORIGIN='https://api-publica.datajud.cnj.jus.br';
const RATE_LIMIT_MS=15*60_000;
const CORS_BACKOFF_MS=10*60_000;
const TIMEOUT_MS=12_000;
const limitedUntil=new Map();
let corsBackoffUntil=0;

const failed=(number,reason,error,status)=>({ok:false,source:'DataJud',number,found:false,items:[],reason,error,status});
function retryDelay(response){
 const raw=response?.headers?.get?.('Retry-After')||'';
 const seconds=/^\d+$/.test(raw)?Number(raw)*1000:NaN;
 const date=Date.parse(raw),parsed=Number.isFinite(seconds)?seconds:Number.isFinite(date)?date-Date.now():RATE_LIMIT_MS;
 return Math.max(RATE_LIMIT_MS,Math.min(60*60_000,parsed));
}
function reasonFromValidation(error){
 if(error?.code==='index_timeout')return 'index_timeout';
 if(error?.code==='shard_failure')return 'shard_failure';
 return 'invalid_response';
}

/**
 * Consulta a API pública DataJud pelo navegador do operador.
 * Só usa HTTPS/CORS, CNJ exato e a chave pública do CNJ.
 * Não usa no-cors, cookies, proxy, certificado, CAPTCHA ou endpoints privados.
 * Um resultado do navegador é identificado como tal e deve ser salvo com essa origem.
 */
export async function browseOfficialDataJudNumber({number,fetchImpl=fetch,signal:externalSignal,fast=false}={}){
 let formatted,alias,digits;
 try{formatted=formatProcessNumber(number);alias=resolveCourtAlias(formatted);digits=formatted.replace(/\D/g,'')}
 catch(error){return failed(String(number||''),'invalid_cnj',String(error?.message||'Número CNJ inválido.'))}
 if(Date.now()<corsBackoffUntil)
  return failed(formatted,'browser_cooldown','Consulta direta DataJud suspensa nesta sessão após falha de rede/CORS.');
 if(Date.now()<(limitedUntil.get(alias)||0))
  return failed(formatted,'rate_limited','DataJud pediu pausa para este tribunal; nenhuma nova chamada foi feita.',429);

 const controller=new AbortController();
 const abort=()=>controller.abort();
 if(externalSignal?.aborted)controller.abort();
 externalSignal?.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(()=>controller.abort(),fast?8_000:TIMEOUT_MS);
 const url=ORIGIN+'/api_publica_'+alias+'/_search';
 try{
  const response=await fetchImpl(url,{
   method:'POST',mode:'cors',credentials:'omit',redirect:'error',cache:'no-store',
   headers:{Authorization:'APIKey '+currentPublicKey('',PUBLIC_DATAJUD_KEY),
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({size:1,query:{match:{numeroProcesso:digits}}}),
   signal:controller.signal
  });
  if(response.status===429){
   limitedUntil.set(alias,Date.now()+retryDelay(response));
   return failed(formatted,'rate_limited','DataJud respondeu HTTP 429; respeite o intervalo solicitado.',429);
  }
  if(response.status===403)return failed(formatted,'blocked_403','DataJud respondeu HTTP 403 ao navegador; respeite o bloqueio.',403);
  if(!response.ok)return failed(formatted,'http_error','DataJud respondeu HTTP '+response.status+'.',response.status);
  let payload;
  try{payload=await response.json()}catch{return failed(formatted,'invalid_response','DataJud não retornou JSON válido.',response.status)}
  try{validatePublicDataJudResponse(payload)}catch(error){
   return failed(formatted,reasonFromValidation(error),String(error?.message||'Resposta DataJud incompleta.'),response.status);
  }
  const hits=payload.hits.hits;
  const match=hits.find(hit=>String(hit?._source?.numeroProcesso||'').replace(/\D/g,'')===digits)?._source;
  if(!match)return failed(formatted,hits.length?'cnj_mismatch':'not_indexed',
   hits.length?'DataJud retornou outro CNJ; resultado descartado.':'CNJ não localizado nesta resposta do índice público.',response.status);
  const parsed=normalizeDataJud(match,formatted);
  if(!parsed.found)return failed(formatted,'cnj_mismatch','A resposta não corresponde exatamente ao CNJ solicitado.',response.status);
  return {ok:true,source:'DataJud',number:formatted,found:true,items:parsed.movements.slice(0,120),
   meta:parsed.meta,court:alias.toUpperCase(),checkedAt:new Date().toISOString(),via:'navegador',
   notice:'Metadados e movimentos recebidos diretamente da API pública DataJud pelo navegador. Não equivalem ao inteiro teor dos autos.',
   status:response.status};
 }catch(error){
  if(controller.signal.aborted)return failed(formatted,'timeout',
   externalSignal?.aborted?'Consulta DataJud interrompida.':'Tempo esgotado na consulta DataJud pelo navegador.');
  if(error instanceof TypeError){
   corsBackoffUntil=Date.now()+CORS_BACKOFF_MS;
   return failed(formatted,'network_error','O navegador não conseguiu acessar o DataJud (rede ou CORS).');
  }
  return failed(formatted,'network_error','Falha de rede na consulta DataJud pelo navegador.');
 }finally{
  clearTimeout(timeout);externalSignal?.removeEventListener('abort',abort);
 }
}
