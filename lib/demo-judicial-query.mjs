import {mergeEvents} from './processos-oficiais.mjs';
// Eventos exclusivamente ficticios, rotulados e sem qualquer chamada externa.
export function buildDemoJudicialResult({number,source='auto',snapshots=[],start='',end='',page=1}={}){
 const types=source==='auto'?['djen','datajud']:[source];
 const sourceStatus={djen:types.includes('djen')?'simulated':'not_checked',
  datajud:types.includes('datajud')?'simulated':'not_checked'};
 const items=Number(page)===1?mergeEvents(...types.map(kind=>(snapshots||[])
  .filter(s=>s?.source===kind&&s?.payload?.demo===true&&s?.payload?.official===false)
  .flatMap(s=>(s.payload.items||[]).filter(ev=>{const date=String(ev.date||'').slice(0,10);
   return (!start||date>=start)&&(!end||date<=end)}).map(ev=>({...ev,demo:true}))))):[];
 return {ok:true,demo:true,official:false,parserVersion:99,number,source:source==='auto'?'DJEN + DataJud':source==='djen'?'DJEN':'DataJud',
  found:items.length>0,items,checkedAt:new Date().toISOString(),sourceStatus,
  sourceErrors:{djen:null,datajud:null},partial:false,limited:false,hasMore:false,total:items.length,
  page:Number(page)||1,notice:'DEMONSTRAÇÃO · Dados totalmente fictícios. Nenhuma consulta ao DJEN ou DataJud foi realizada.'};
}
