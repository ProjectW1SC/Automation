// Transporte único Node/Deno. Os limites valem também durante a leitura do corpo.
export const officialError=(message,status=502,code='upstream_error',extra={})=>Object.assign(new Error(message),{status,code,...extra});
export function withOfficialDeadline(run,{timeoutMs=55000,signal}={}){
 const controller=new AbortController();let timer,stop;
 return new Promise((resolve,reject)=>{
  stop=()=>{controller.abort();reject(officialError('Consulta cancelada.',499,'cancelled'))};
  if(signal?.aborted){stop();return}
  signal?.addEventListener('abort',stop,{once:true});
  timer=setTimeout(()=>{controller.abort();reject(officialError('A fonte oficial excedeu o tempo disponível para esta consulta.',504,'upstream_timeout'))},timeoutMs);
  Promise.resolve().then(()=>run(controller.signal)).then(resolve,reject);
 }).finally(()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop)});
}
function retryDelay(header,now){
 if(!header)return null;
 const seconds=Number(header);if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;
 const date=Date.parse(header);return Number.isFinite(date)?Math.max(0,date-now):null;
}
function sleep(ms,signal){return new Promise((resolve,reject)=>{
 if(signal?.aborted){reject(officialError('Consulta cancelada.',499,'cancelled'));return}
 const onAbort=()=>{clearTimeout(timer);reject(officialError('Consulta cancelada.',499,'cancelled'))};
 const timer=setTimeout(()=>{signal?.removeEventListener('abort',onAbort);resolve()},ms);
 signal?.addEventListener('abort',onAbort,{once:true});
})}
export function djenPageInfo(payload,page=1){
 const rows=Array.isArray(payload)?payload:payload?.items||payload?.content||payload?.comunicacoes||payload?.resultado;
 if(!Array.isArray(rows))throw officialError('DJEN não retornou uma lista verificável.',502,'invalid_payload');
 const count=Number(payload?.count),hasCount=payload?.count!==null&&payload?.count!==''&&Number.isInteger(count)&&count>=0;
 const offset=(page-1)*50;
 return {rows,total:hasCount?count:null,hasMore:hasCount?offset+rows.length<count:rows.length>=50,
  missingPage:hasCount&&rows.length===0&&count>offset};
}
export async function requestOfficialJson(url,init={},options={}){
 const source=options.source||'datajud',fetchImpl=options.fetchImpl||fetch,now=options.now||Date.now;
 const attemptMs=options.timeoutMs??(source==='datajud'?45000:12000);
 const budgetMs=options.budgetMs??(source==='datajud'?55000:26000);
 const maxRetries=options.maxRetries??(source==='datajud'?2:1),wait=options.wait||sleep,started=now();
 return withOfficialDeadline(async signal=>{
  for(let attempt=0;;attempt++){
   const remaining=budgetMs-(now()-started);
   if(remaining<=0)throw officialError('Orçamento de consulta esgotado.',504,'upstream_timeout');
   let payload,error;
   try{
    payload=await withOfficialDeadline(async attemptSignal=>{
     const response=await fetchImpl(url,{...init,cache:'no-store',redirect:'error',signal:attemptSignal});
     const raw=typeof response.text==='function'?await response.text():'';
     if(raw.length>2400000)throw officialError('Resposta oficial excedeu o limite de tamanho.',502,'invalid_payload');
     let data;try{data=JSON.parse(raw)}catch{data=null}
     const after=retryDelay(response.headers?.get?.('retry-after'),now());
     const rejected=/es_rejected_execution_exception|rejected execution/i.test(JSON.stringify(data?.error||''));
     if(!response.ok)throw officialError(
      source.toUpperCase()+' respondeu HTTP '+response.status+(rejected?' (fila de busca temporariamente cheia).':'.'),
      response.status,rejected?'search_queue_rejected':'upstream_http',
      {retryAfterMs:after,transient:source==='datajud'?(response.status===429&&rejected)||[500,502,503].includes(response.status):response.status>=500&&response.status!==504});
     if(!data||typeof data!=='object')throw officialError('Fonte oficial não retornou JSON verificável.',502,'invalid_payload');
     if(source==='datajud'){
      if(data.timed_out===true)throw officialError('O índice DataJud não concluiu a busca.',504,'index_timeout');
      if(Number(data._shards?.failed||0)>0)throw officialError('O índice DataJud retornou shards incompletos.',502,'shard_failure',{transient:true});
      if(!Array.isArray(data.hits?.hits))throw officialError('DataJud não retornou resultados verificáveis.',502,'invalid_payload');
     }else if(djenPageInfo(data,options.page||1).missingPage){
      throw officialError('DJEN informou publicações, mas a página veio vazia. O histórico está incompleto.',502,'incomplete_page',{transient:true});
     }
     return data;
    },{timeoutMs:Math.min(attemptMs,remaining),signal});
   }catch(e){error=e}
   if(!error)return payload;
   const delay=Math.max(error.retryAfterMs||0,(source==='datajud'?2000:1500)*2**attempt);
   // 403, quota 429 sem diagnóstico ES, 504 e timeout não mudam de rede nem entram em retry.
   if(!error.transient||attempt>=maxRetries||delay+500>=budgetMs-(now()-started))throw error;
   await wait(delay,signal);
  }
 },{timeoutMs:budgetMs,signal:options.signal});
}
