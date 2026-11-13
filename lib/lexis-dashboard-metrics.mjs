import {buildLexisEvents} from './lexis-operations.mjs';
import {hasProcessNumber,isLexisClosed,summarizeLexisReturns} from './lexis-return-kpis.mjs';
const normalized=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const canceled=h=>/CANCELAD|ADIAD|DESMARC|SUSPENS/.test(normalized(h.situacao));
export function summarizeLexisDashboard({processes=[],hearings=[],tasks=[],manual=[],members=[],today}={}){
 const kpi=summarizeLexisReturns(processes,today);
 const cases=processes.filter(hasProcessNumber);
 const active=cases.filter(p=>!isLexisClosed(p));
 const events=buildLexisEvents({processes,hearings,tasks,manual,members,today});
 const hearingsEvents=events.filter(x=>x.kind==='audiencia');
 const available=events.filter(x=>x.due_on&&x.due_on>=today&&!['encerrado','atendido'].includes(x.status)).sort((a,b)=>a.due_on.localeCompare(b.due_on));
 const deadline=new Date(today+'T12:00:00Z');deadline.setUTCDate(deadline.getUTCDate()+7);
 const byCourt=new Map();
 for(const p of active){const court=String(p.tribunal||'Nao informado').trim()||'Nao informado';byCourt.set(court,(byCourt.get(court)||0)+1)}
 const tribunals=[...byCourt].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'pt-BR')).slice(0,6);
 const [yy,mm]=today.slice(0,7).split('-').map(Number);
 const months=Array.from({length:6},(_,i)=>{
  const month=new Date(Date.UTC(yy,mm-6+i,1)).toISOString().slice(0,7);
  return {month,count:cases.filter(p=>String(p.created_at||'').slice(0,7)===month).length};
 });
 return {
  processes:kpi.processes,active:kpi.active,closed:kpi.closed,excludedNoCnj:kpi.excludedNoCnj,
  overdueTotal:kpi.overdue,overdueReturns:kpi.overdue,
  returnsScheduled:kpi.scheduled,returnsToday:kpi.today,returnsNext7:kpi.next7,
  returnsAttended:kpi.attended,
  overdueTasks:events.filter(x=>x.kind==='tarefa'&&x.status==='vencido').length,
  hearingsTotal:hearingsEvents.length,
  hearingsFuture:hearingsEvents.filter(x=>x.due_on&&x.due_on>=today&&x.status!=='encerrado').length,
  hearingsPast:hearingsEvents.filter(x=>x.due_on&&x.due_on<today&&x.status!=='encerrado').length,
  hearingsUndated:hearingsEvents.filter(x=>!x.due_on&&x.status!=='encerrado').length,
  hearingsCanceled:hearings.filter(h=>hasProcessNumber(h)&&canceled(h)).length,
  upcoming7:available.filter(x=>x.due_on<=deadline.toISOString().slice(0,10)).length,
  upcoming:available.slice(0,8),
  priorities:events.filter(x=>x.kind==='retorno'&&x.status==='vencido').slice(0,8),
  tribunals,months
 };
}
