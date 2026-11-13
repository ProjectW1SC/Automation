import {withOfficialDeadline} from '../supabase/functions/_shared/official-http.mjs';
// Consultas históricas DJEN por meses de calendário, sem alterar os limites do CNJ.
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
const blocked=x=>/\b(403|429)\b|\bCORS\b|bloqueio|blocked/i.test(reason(x));
const pageStatus=x=>x==='ok'||x==='ok_browser';
/**
 * Orquestra requisições mensais (máx. 31 dias) em sequência. Um DataJud por operação;
 * o restante são apenas GETs DJEN. Bloqueios encerram tentativas na mesma rede.
 */
export async function consultHistoricalCase({number,start,end,page=1,source='auto',fetchServer,fetchBrowser,onProgress=()=>{},onResult=()=>{},signal,budgetMs=65000,maxWindows=3,independentSources=false}={}){
 if(typeof fetchServer!=='function')throw new Error('Consulta do servidor indisponível.');
 if(signal?.aborted)throw Object.assign(Error('Consulta cancelada.'),{code:'cancelled'});
 // As fontes terminam e aparecem separadamente; DJEN não espera o DataJud.
 if(source==='auto'&&independentSources){
  const results={};
  const combine=()=>{
   const rows=Object.values(results),items=mergeEvents(rows.flatMap(r=>r.items||[]));
   const complete=rows.length===2,partial=!complete||rows.some(r=>r.partial);
   return {ok:rows.some(r=>r.ok),items,found:items.length>0,source:'DJEN + DataJud',partial,
    sourceStatus:{djen:results.djen?.sourceStatus?.djen||'checking',datajud:results.datajud?.sourceStatus?.datajud||'checking'},
    sourceErrors:{djen:results.djen?.sourceErrors?.djen,datajud:results.datajud?.sourceErrors?.datajud},
    fromCache:rows.some(r=>r.fromCache),stale:rows.some(r=>r.stale),limited:rows.some(r=>r.limited),
    persistenceErrors:rows.flatMap(r=>r.persistenceErrors||[]),
    windowsChecked:results.djen?.windowsChecked||0,windowsTotal:results.djen?.windowsTotal||0,
    windowsPending:results.djen?.windowsPending||0,nextWindow:results.djen?.nextWindow,
    checkedAt:new Date().toISOString(),
    notice:!complete?'Uma fonte já respondeu; aguardando a outra.':
     items.length?items.length+' registro(s) retornado(s).'+(partial?' Há fontes ou períodos pendentes.':''):
     partial?'Histórico judicial não confirmado: há fontes ou períodos pendentes.':
     'Nenhum registro retornado para o período DJEN consultado e para o índice público DataJud.'};
  };
  await Promise.all(['djen','datajud'].map(async kind=>{
   results[kind]=await consultHistoricalCase({number,start,end,page,source:kind,fetchServer,fetchBrowser,onProgress,
    signal,budgetMs,maxWindows,onResult:result=>{results[kind]=result;onResult(combine())}});
   onResult(combine());
  }));
  return combine();
 }
 const started=Date.now();
 const bounded=run=>withOfficialDeadline(run,{timeoutMs:Math.max(1,budgetMs-(Date.now()-started)),signal});

 // Sem datas explícitas, usar a janela padrão do Hermes, não janelas fragmentadas.
 const ranges=source==='datajud'?[{start:start||'',end:end||''}]:
  !start&&!end?[{start:'',end:''}]:splitDjenCalendarMonths({start,end});
 const items=[],djenStates=[],errors={djen:null,datajud:null},persistenceErrors=[];
 let datajud='not_checked',browserBlocked=false,fromCache=false,stale=false,limited=false,completed=0,live=false;
 for(let index=0;index<Math.min(ranges.length,maxWindows);index++){
  if(signal?.aborted)throw Object.assign(Error('Consulta cancelada.'),{code:'cancelled'});
  if(Date.now()-started>=budgetMs)break;
  const range=ranges[index];
  const kind=source==='auto'&&index>0?'djen':source;
  onProgress({current:index+1,total:ranges.length,start:range.start,end:range.end});
  let server;
  try{server=await bounded(signal=>fetchServer({number,source:kind,start:range.start,end:range.end,page,signal}));}
  catch(e){if(e.code==='cancelled')throw e;server={ok:false,error:reason(e)};}
  if(!server||typeof server!=='object')server={ok:false,error:'Resposta do servidor inválida.'};
  if(server.code==='crm_access')throw Error(server.error||'Sessão sem permissão para consultar este processo.');
  items.push(...(Array.isArray(server.items)?server.items:[]));
  fromCache=fromCache||!!server.fromCache;stale=stale||!!server.stale;
  limited=limited||!!server.limited||!!server.hasMore;
  for(const error of server.persistenceErrors||[])if(error&&!persistenceErrors.includes(error))persistenceErrors.push(error);
  if(server.snapshotError&&!persistenceErrors.includes(server.snapshotError))persistenceErrors.push(server.snapshotError);
  if(index===0&&(kind==='auto'||kind==='datajud')){
   datajud=server.sourceStatus?.datajud||(kind==='datajud'?(server.ok?(server.stale||server.fromCache?'cached_previous':'ok'):'unavailable'):'unavailable');
   errors.datajud=server.sourceErrors?.datajud||server.sourceError||(!server.ok?reason(server):null);
   if(datajud==='ok')live=true;
  }
  if(source!=='datajud'){
   let state=server.sourceStatus?.djen||(kind==='djen'?(server.ok?(server.stale||server.fromCache?'cached_previous':'ok'):'unavailable'):'unavailable');
   if(!server.sourceStatus?.djen&&(server.stale||server.fromCache))state=state==='ok'?'cached_previous':state;
   // Para histórico com datas explícitas, permitir tentativa no navegador mesmo com cache antigo.
   // Na consulta padrão recente, não repetir uma fonte já confirmada pelo Hermes.
   const shouldTry=state!=='ok'&&(state!=='cached_previous'||!!start||!!end)&&!browserBlocked&&typeof fetchBrowser==='function'
    &&!(/403|429/.test(String(server.sourceErrors?.djen||server.error||''))||['rate_limited_429','blocked_403'].includes(state));
   if(shouldTry){
    try{
     const browser=await bounded(signal=>fetchBrowser({number,start:range.start,end:range.end,page,signal}));
     if(browser?.ok!==true||!Array.isArray(browser.items))throw Error('Navegador não retornou publicações verificáveis.');
     items.push(...browser.items);state='ok_browser';live=true;
     limited=limited||!!browser.limited||!!browser.hasMore;
    }catch(e){
     if(e.code==='cancelled')throw e;errors.djen=reason(e);if(blocked(e))browserBlocked=true;
    }
   }
   if(!pageStatus(state))errors.djen=errors.djen||server.sourceErrors?.djen||server.sourceError||(!server.ok?reason(server):null);
   if(pageStatus(state))live=true;
   djenStates.push(state);
   // Não repetir consultas a meses seguintes quando ambas as redes bloquearam.
   const serverBlocked=state!=='ok_browser'&&/403|429|blocked|rate_limited/.test(String(server.sourceStatus?.djen||server.error||''));
   if(serverBlocked){completed=index+1;break;}
  }
  completed=index+1;
 }
 const djen=source==='datajud'?'not_checked':djenStates.length>0&&djenStates.every(pageStatus)
   ?(djenStates.includes('ok_browser')?'ok_browser':'ok')
   :djenStates.includes('cached_previous')?'cached_previous'
   :djenStates.find(x=>!pageStatus(x))||'unavailable';
 const partial=completed<ranges.length||(source==='auto'&&(datajud!=='ok'||!pageStatus(djen)))
  ||(source==='djen'&&!pageStatus(djen))||(source==='datajud'&&datajud!=='ok');
 const resultItems=mergeEvents(items);
 return {ok:live||resultItems.length>0,source:source==='auto'?'DJEN + DataJud':source==='djen'?'DJEN':'DataJud',
  items:resultItems,found:resultItems.length>0,partial,fromCache,stale:stale||(!live&&fromCache),
  sourceStatus:{djen,datajud},sourceErrors:errors,persistenceErrors,limited,windowsChecked:completed,windowsTotal:ranges.length,
  windowsPending:ranges.length-completed,nextWindow:ranges[completed]||null,checkedAt:new Date().toISOString(),
  notice:resultItems.length?resultItems.length+' registro(s) retornado(s).'+(partial?' Há fontes sem atualização confirmada.':''):
   partial?'Nenhuma movimentação retornada; o histórico judicial não foi confirmado porque há fontes ou períodos pendentes.':
   'Nenhum registro retornado para o período consultado. Outras datas podem conter publicações.'};
}
