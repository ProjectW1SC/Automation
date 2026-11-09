import {queueCounts,taskStatus} from './tarefas.mjs';
import {toCsvCell} from './minhas-atividades.mjs';

const MONTH=/^20\d{2}-(0[1-9]|1[0-2])$/;
const DATE=/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
function addDays(day,n){
 const dt=new Date(day+'T12:00:00.000Z');
 dt.setUTCDate(dt.getUTCDate()+n);
 return dt.toISOString().slice(0,10);
}
export function periodBounds(period='mes',today='2026-11-09'){
 if(!DATE.test(today)||Number.isNaN(Date.parse(today+'T12:00:00.000Z')))throw new Error('Data de referência inválida');
 if(period==='mes'){
  const month=today.slice(0,7);
  if(!MONTH.test(month))throw new Error('Mês inválido');
  const [y,m]=month.split('-').map(Number);
  const next=m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0');
  return {start:month+'-01',endExclusive:next+'-01'};
 }
 const day=new Date(today+'T12:00:00.000Z');
 const monday=(day.getUTCDay()+6)%7;
 const start=addDays(today,-monday+(period==='semana_passada'?-7:0));
 const endExclusive=addDays(start,7);
 return {start,endExclusive};
}
function stampInSaoPaulo(stamp){
 if(!stamp)return '';
 const dt=new Date(stamp);
 if(Number.isNaN(dt.getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(dt);
 const part=t=>parts.find(p=>p.type===t)?.value||'';
 return [part('year'),part('month'),part('day')].join('-');
}
function inPeriod(day,bounds){return !!day&&day>=bounds.start&&day<bounds.endExclusive;}
const ATTENDANCE_KINDS=new Set(['atendimento','registro_atendimento','atendimento_registrado']);
export function filterManualActivities(rows,actorId){
 return (rows||[]).filter(row=>row.actor_id===actorId);
}
export function buildReport({clients=[],audit=[],manual=[],today='2026-11-09',period='mes',scope='empresa',actorId=null}={}){
 const bounds=periodBounds(period,today);
 const counts=queueCounts(clients,today);
 const active=clients.filter(c=>c.workflow_status!=='finalizado');
 const final=clients.filter(c=>c.workflow_status==='finalizado');
 const genuineAudit=audit.filter(a=>ATTENDANCE_KINDS.has(a.kind) && (scope!=='meus'||a.actor_id===actorId) && inPeriod(stampInSaoPaulo(a.created_at),bounds));
 const inPeriodManual=manual.filter(a=>a.origin==='registro_manual_autodeclarado'||a.origin==null).filter(a=>(scope!=='meus'||a.actor_id===actorId)&&inPeriod(a.performed_on,bounds));
 const closed=final.filter(c=>inPeriod(stampInSaoPaulo(c.finished_at),bounds));
 const days=[];
 for(let day=bounds.start;day<bounds.endExclusive;day=addDays(day,1)){
  days.push({day,attendances:genuineAudit.filter(a=>stampInSaoPaulo(a.created_at)===day).length,
   activities:inPeriodManual.filter(a=>a.performed_on===day).length,
   finished:closed.filter(c=>stampInSaoPaulo(c.finished_at)===day).length});
  if(days.length>32)break;
 }
 const byCategory=[...new Set(inPeriodManual.map(a=>a.category||'outro'))].map(category=>({
  category,count:inPeriodManual.filter(a=>a.category===category).length
 })).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category));
 return {
  periodBounds:bounds,
  portfolio:{
   total:clients.length,active:counts.active,finalized:counts.finalizado,overdue:counts.vencido,
   dueToday:counts.hoje,upcoming:counts.em_dia,withoutDate:counts.sem_data,
   verified:clients.filter(c=>c.evidence_status==='quitacao_verificada').length,
   paidInSheet:clients.filter(c=>c.source_status==='quitado_na_planilha').length
  },
  period:{
   attendances:genuineAudit.length,
   manualActivities:inPeriodManual.length,
   contactsConfirmed:inPeriodManual.filter(a=>a.category==='atendimento'&&a.contact_confirmed).length,
   clientsContacted:new Set(genuineAudit.map(a=>a.client_id).filter(Boolean)).size,
   finalized:closed.length,
   sourceConflicts:clients.filter(c=>c.source_conflict).length,
   trackedSeconds:inPeriodManual.reduce((sum,a)=>sum+Math.max(0,Number(a.duration_seconds||0)),0),
  },
  daily:days,byCategory,
  activitySource:scope==='meus'?'Somente registros do usuário autenticado':'Registros autorizados para esta conta',
 };
}
export function exportReportCsv(report){
 const cells=[
  ['Indicador','Valor'],
  ['Clientes na carteira',report.portfolio.total],
  ['Clientes ativos',report.portfolio.active],
  ['Clientes finalizados',report.portfolio.finalized],
  ['Retornos vencidos',report.portfolio.overdue],
  ['Quitações verificadas',report.portfolio.verified],
  ['Atendimentos no período',report.period.attendances],
  ['Atividades concluídas',report.period.manualActivities],
  ['Contatos confirmados em atividades',report.period.contactsConfirmed],
  ['Clientes atendidos distintos',report.period.clientsContacted],
  ['Conflitos de origem',report.period.sourceConflicts],
  ['Dia','Atendimentos','Atividades','Finalizações'],
  ...(report.daily||[]).map(x=>[x.day,x.attendances,x.activities,x.finished])
 ];
 return '\uFEFF'+cells.map(row=>row.map(toCsvCell).join(';')).join('\r\n');
}
