import {mergeEvents} from './processos-oficiais.mjs';
export async function consultBothOfficialSources({djen,datajud}){
 const [dj,dt]=await Promise.allSettled([djen(),datajud()]);
 const works=([dj,dt].filter(x=>x.status==='fulfilled'&&x.value?.ok!==false));
 const statusOf=x=>x.status==='fulfilled'?(x.value?.ok===false?'unavailable':'ok'):/429/.test(x.reason?.message||'')?'rate_limited_429':/403/.test(x.reason?.message||'')?'blocked_403':/tempo limite|timeout/i.test(x.reason?.message||'')?'timeout':'unavailable';
 const sourceStatus={djen:statusOf(dj),datajud:statusOf(dt)};
 if(!works.length)return {ok:false,found:false,items:[],source:'DJEN + DataJud',partial:true,sourceStatus,error:'As duas fontes oficiais estão indisponíveis ou bloqueadas. Nenhuma movimentação nova foi confirmada.',notice:'Confira o CNJ nos portais oficiais; não significa ausência de movimentações.'};
 const a=dj.status==='fulfilled'&&dj.value?.ok!==false?dj.value:null;
 const b=dt.status==='fulfilled'&&dt.value?.ok!==false?dt.value:null;
 const items=mergeEvents(a?.items||[],b?.items||[]);
 const partial=!a||!b||!!a?.stale||!!b?.stale;
 return {ok:true,source:'DJEN + DataJud',found:items.length>0,items,meta:b?.meta||null,checkedAt:new Date().toISOString(),sourceStatus,partial,limited:!!a?.limited||!!b?.limited,stale:!!a?.stale||!!b?.stale,fromCache:!!a?.fromCache||!!b?.fromCache,notice:partial?'Resultado parcial. Cada fonte foi identificada separadamente e bloqueios não foram tratados como ausência de movimentos.':'Movimentações DataJud e publicações DJEN reunidas por data, com a origem preservada.'};
}