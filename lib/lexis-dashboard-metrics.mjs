import {buildLexisEvents,isFinished} from './lexis-operations.mjs';
const normalized=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const cancel=h=>/CANCELAD|ADIAD|DESMARC|SUSPENS/.test(normalized(h.situacao));
export function summarizeLexisDashboard({processes=[],hearings=[],tasks=[],manual=[],members=[],today}={}){
 const events=buildLexisEvents({processes,hearings,tasks,manual,members,today});
 const live=processes.filter(p=>!isFinished(p.status_interno));
 const expired=events.filter(x=>x.kind!=='audiencia'&&x.status==='vencido');
 const deadlines=events.filter(x=>x.kind==='prazo'&&x.status==='vencido');
 const returns=events.filter(x=>x.kind==='retorno'&&x.status==='vencido');
 const chores=events.filter(x=>x.kind==='tarefa'&&x.status==='vencido');
 const h=events.filter(x=>x.kind==='audiencia');
 const future=h.filter(x=>x.due_on&&x.due_on>=today&&x.status!=='encerrado');
 const past=h.filter(x=>x.due_on&&x.due_on<today&&x.status!=='encerrado');
 const undated=h.filter(x=>!x.due_on&&x.status!=='encerrado');
 const upcoming=events.filter(x=>x.due_on&&x.due_on>=today&&x.status!=='encerrado').sort((a,b)=>a.due_on.localeCompare(b.due_on));
 const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);
 const countByTribunal=new Map();
 for(const p of live){const k=String(p.tribunal||'Não informado').trim()||'Não informado';countByTribunal.set(k,(countByTribunal.get(k)||0)+1)}
 const tribunals=[...countByTribunal].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'pt-BR')).slice(0,6);
 const [yy,mm]=today.slice(0,7).split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>{const date=new Date(Date.UTC(yy,mm-6+i,1)).toISOString().slice(0,7);return {month:date,count:processes.filter(p=>String(p.created_at||'').slice(0,7)===date).length}});
 return {
  processes:processes.length,active:live.length,closed:processes.length-live.length,
  overdueTotal:expired.length,overdueDeadlines:deadlines.length,overdueReturns:returns.length,overdueTasks:chores.length,
  hearingsTotal:h.length,hearingsFuture:future.length,hearingsPast:past.length,
  hearingsUndated:undated.length,hearingsCanceled:hearings.filter(cancel).length,
  upcoming7:upcoming.filter(x=>x.due_on<=end.toISOString().slice(0,10)).length,
  upcoming:upcoming.slice(0,8),priorities:expired.slice(0,8),
  tribunals,months
 };
}
