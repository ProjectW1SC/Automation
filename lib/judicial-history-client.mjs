// Consultas históricas oficiais com cache, navegador do operador e fallback de servidor.
import {mergeEvents} from './processos-oficiais.mjs';

function day(raw){
 const value=String(raw||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Informe uma data no formato AAAA-MM-DD.');
 const ms=Date.parse(value+'T12:00:00Z');
 if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==value)throw new Error('Data DJEN inválida.');
 return value;
}
function shifted(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function splitDjenCalendarMonths({start,end}={}){
 const finish=day(end||new Date().toISOString().slice(0,10));
 const begin=day(start||shifted(finish,-30));
 if(begin>finish)throw new Error('Data inicial deve ser anterior à data final.');
 const ranges=[];let cursor=begin;
 while(cursor<=finish){
  const [y,m]=cursor.slice(0,7).split('-').map(Number);
  const monthEnd=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
  const until=monthEnd<finish?monthEnd:finish;
  ranges.push({start:cursor,end:until});cursor=shifted(until,1);
  if(ranges.length>600)throw new Error('Intervalo histórico superior a 50 anos. Confirme as datas.');
 }
 return ranges;
}
const reason=x=>String(x?.message||x?.error||'Fonte oficial indisponível').slice(0,220);
const hardBlock=x=>Number(x?.status)===403||Number(x?.status)===429||
 x?.reason==='blocked_403'||x?.reason==='rate_limited'||x?.code==='blocked_403'||x?.code==='rate_limited';
const stateOf=x=>{
 if(x?.ok===true)return x?.stale||x?.fromCache?'cached_previous':x?.via==='navegador'?'ok_browser':'ok';
 const status=Number(x?.status);
 if(status===403||x?.reason==='blocked_403')return 'blocked_403';
 if(status===429||x?.reason==='rate_limited')return 'rate_limited_429';
 if(/timeout|tempo limite|esgotado/i.test(reason(x)))return 'timeout';
 return 'unavailable';
};
const pageStatus=x=>x==='ok'||x==='ok_browser';

/**
 * Cada fonte tem sua própria ordem: snapshot recente -> navegador do operador ->
 * servidor, exceto 403/429, que não são contornados por outra rede.
 * O callback saveBrowser persiste apenas o resultado público identificado como navegador.
 */
export async function consultHistoricalCase({
 number,start,end,page=1,source='auto',fetchServer,fetchBrowser,
 fetchDataJudBrowser,saveBrowser,recordBrowserBlock,onProgress=()=>{}
}={}){
 if(typeof fetchServer!=='function')throw new Error('Consulta do servidor indisponível.');
 const ranges=source==='datajud'?[{start:start||'',end:end||''}]:
  !start&&!end?[{start:'',end:''}]:splitDjenCalendarMonths({start,end});
 const items=[],djenStates=[],errors={djen:null,datajud:null},sourceVia={djen:null,datajud:null};
 const browserPaused={djen:false,datajud:false};
 let datajud='not_checked',fromCache=false,stale=false,limited=false,completed=0,live=false;
 async function consultOne(kind,range){
  const args={number,source:kind,start:range.start,end:range.end,page};
  let cache=null;
  try{cache=await fetchServer({...args,cacheOnly:true})}catch(e){cache={ok:false,error:reason(e)}}
  if(cache?.ok===true&&cache?.fromCache){
   return cache;
  }
  // A 401/403 nesta etapa é bloqueio de acesso ao CRM, não da API judicial.
  if([401,403].includes(Number(cache?.status))&&!cache?.cacheMiss)return cache;

  let browser=null;
  const browserFn=kind==='datajud'?fetchDataJudBrowser:fetchBrowser;
  if(typeof browserFn==='function'&&!browserPaused[kind]){
   try{
    browser=await browserFn(args);
    if(browser?.ok===true&&Array.isArray(browser.items)){
     if(typeof saveBrowser==='function'){
      try{
       const saved=await saveBrowser({...args,result:browser});
       if(saved?.ok===false)browser={...browser,snapshotSaved:false,snapshotError:String(saved.error||'Snapshot não salvo').slice(0,220)};
       else browser={...browser,snapshotSaved:true};
      }catch(e){browser={...browser,snapshotSaved:false,snapshotError:reason(e)}}
     }
     return browser;
    }
   }catch(e){browser={ok:false,status:e?.status,reason:e?.code||'network_error',error:reason(e)}}
   if(hardBlock(browser)){
    if(typeof recordBrowserBlock==='function'){
     try{await recordBrowserBlock({number,source:kind,status:Number(browser?.status)|| (browser?.reason==='blocked_403'?403:429)})}catch{}
    }
    return browser;
   }
   if(browser?.reason==='network_error'||browser?.reason==='browser_cooldown'||
      browser?.code==='network_error'||/rede ou CORS/i.test(reason(browser)))browserPaused[kind]=true;
  }

  // A falha de CORS/rede/timeout do navegador permite a alternativa já autenticada.
  try{return await fetchServer(args)}
  catch(e){return {ok:false,status:e?.status,reason:e?.code||'network_error',error:reason(e)}}
 }

 for(let index=0;index<ranges.length;index++){
  const range=ranges[index],kind=source==='auto'&&index>0?'djen':source;
  onProgress({current:index+1,total:ranges.length,start:range.start,end:range.end});
  const kinds=kind==='auto'?['datajud','djen']:[kind];
  for(const current of kinds){
   const result=await consultOne(current,range);
   if(Array.isArray(result?.items))items.push(...result.items);
   fromCache=fromCache||!!result?.fromCache;stale=stale||!!result?.stale;
   sourceVia[current]=result?.via||(result?.fromCache?'cache':result?.ok?'servidor':null);
   limited=limited||!!result?.limited||!!result?.hasMore;
   const state=stateOf(result);
   if(current==='datajud'){
    datajud=state;errors.datajud=state==='ok'||state==='ok_browser'||state==='cached_previous'?null:reason(result);
   }else{
    djenStates.push(state);errors.djen=pageStatus(state)||state==='cached_previous'?null:reason(result);
   }
   if(pageStatus(state))live=true;
   if(hardBlock(result)){
    // No additional call to a source that explicitly rejected the browser request.
    if(current==='djen')break;
   }
  }
  completed=index+1;
  if(index+1<ranges.length){
   const djenState=djenStates[djenStates.length-1];
   if(hardBlock({status:djenState==='blocked_403'?403:djenState==='rate_limited_429'?429:0})){
    completed=index+1;break;
   }
  }
 }
 const djen=source==='datajud'?'not_checked':djenStates.length&&djenStates.every(pageStatus)
   ?(djenStates.includes('ok_browser')?'ok_browser':'ok')
   :djenStates.includes('cached_previous')?'cached_previous'
   :djenStates.find(x=>!pageStatus(x))||'unavailable';
 const partial=completed<ranges.length||(source==='auto'&&(datajud!=='ok'&&datajud!=='ok_browser'||!pageStatus(djen)))
  ||(source==='djen'&&!pageStatus(djen))||(source==='datajud'&&datajud!=='ok'&&datajud!=='ok_browser');
 const resultItems=mergeEvents(items);
 return {ok:live||resultItems.length>0,source:source==='auto'?'DJEN + DataJud':source==='djen'?'DJEN':'DataJud',
  items:resultItems,found:resultItems.length>0,partial,fromCache,stale:stale||(!live&&fromCache),
  sourceStatus:{djen,datajud},sourceErrors:errors,sourceVia,limited,windowsChecked:completed,windowsTotal:ranges.length,
  windowsPending:ranges.length-completed,checkedAt:new Date().toISOString(),
  notice:partial?'Consulta parcial: fontes identificadas separadamente, sem tratar bloqueios ou cache como ausência de movimentos.':
   'Consulta concluída nas janelas mensais verificadas; movimentações e publicações identificadas por fonte.'};
}
