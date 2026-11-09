import {taskStatus,daysUntil} from './tarefas.mjs';
export function dashboardMetrics(clients=[],today){
 const valid=(clients||[]).filter(Boolean);
 const active=valid.filter(c=>c.workflow_status!=='finalizado');
 const statuses=[
  {code:'vencido',label:'Vencidos',color:'danger'},
  {code:'hoje',label:'Vencem hoje',color:'warn'},
  {code:'em_dia',label:'Em dia',color:'good'},
  {code:'sem_data',label:'Sem data',color:'neutral'},
  {code:'finalizado',label:'Finalizados',color:'neutral'}
 ].map(x=>({...x,value:valid.filter(c=>taskStatus(c,today).code===x.code).length}));
 const byBank=new Map();
 for(const c of active){const bank=String(c.institution||'Sem instituição').trim()||'Sem instituição';byBank.set(bank,(byBank.get(bank)||0)+1)}
 const banks=[...byBank.entries()].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'));
 const top=banks.slice(0,6);if(banks.length>6)top.push({label:'Outras instituições',value:banks.slice(6).reduce((a,x)=>a+x.value,0)});
 const horizon=[
  {code:'overdue',label:'Atrasados',value:0},
  {code:'today',label:'Hoje',value:0},
  {code:'next7',label:'1 a 7 dias',value:0},
  {code:'next30',label:'8 a 30 dias',value:0},
  {code:'later',label:'Mais de 30 dias',value:0},
  {code:'noDate',label:'Sem data',value:0}
 ];
 const dueIndex=new Map(horizon.map(x=>[x.code,x]));
 for(const c of active){const status=taskStatus(c,today);const days=status.days;
  const bucket=days===null?'noDate':days<0?'overdue':days===0?'today':days<=7?'next7':days<=30?'next30':'later';
  dueIndex.get(bucket).value++;
 }
 return {total:valid.length,active:active.length,finalized:valid.length-active.length,
  urgents:active.filter(c=>c.priority_level==='urgente').length,statuses,banks:top,horizon};
}
