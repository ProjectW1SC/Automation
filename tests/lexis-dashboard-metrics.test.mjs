import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLexisDashboard} from '../lib/lexis-dashboard-metrics.mjs';
import {summarizeLexisReturns} from '../lib/lexis-return-kpis.mjs';
import {fetchCompanyRows} from '../lib/lexis-company-data.mjs';
const cnj='0000123-45.2026.8.26.0001';
test('dashboard e prazos repetem a mesma regra de retorno, nunca prazo legado',()=>{
 const processes=[
  {id:1,protocolo_ref:cnj,status_interno:'EM ANDAMENTO',proximo_prazo:'2026-06-10',proximo_retorno:'2026-11-10',ultimo_retorno:'2026-11-08'},
  {id:2,protocolo_ref:cnj,status_interno:'ENCERRADO',proximo_prazo:'2026-03-08',proximo_retorno:'2026-11-02'},
  {id:3,protocolo_ref:cnj,status_interno:'EM ANDAMENTO',proximo_retorno:'2026-11-10',ultimo_retorno:'2026-11-12'},
  {id:4,protocolo_ref:null,status_interno:'EM ANDAMENTO',proximo_retorno:'2026-11-05'},
  {id:5,protocolo_ref:cnj,status_interno:'EM ANDAMENTO',proximo_retorno:'2026-11-13'},
  {id:6,protocolo_ref:cnj,status_interno:'EM ANDAMENTO',proximo_prazo:'2026-05-01',proximo_retorno:'2026-11-20'}
 ];
 const hearings=[
  {id:1,protocolo_ref:cnj,situacao:'publicada',data_evento:'2026-11-08'},
  {id:2,protocolo_ref:cnj,situacao:'data_pendente',data_evento:null},
  {id:3,protocolo_ref:cnj,situacao:'informada',data_evento:'2026-11-20'},
  {id:4,protocolo_ref:cnj,situacao:'cancelada',data_evento:null}
 ];
 const today='2026-11-13',tasks=[{id:'t',feito:false,titulo:'Revisar',due_at:'2026-11-12'}];
 const k=summarizeLexisReturns(processes,today);
 const s=summarizeLexisDashboard({processes,hearings,tasks,today});
 assert.equal(s.processes,5);assert.equal(s.excludedNoCnj,1);
 assert.equal(s.active,4);assert.equal(s.closed,1);
 assert.equal(k.overdue,1);assert.equal(s.overdueReturns,k.overdue);
 assert.equal(s.overdueTotal,k.overdue);assert.equal(s.returnsToday,k.today);
 assert.equal(s.returnsNext7,k.next7);assert.equal(s.returnsAttended,k.attended);
 assert.equal(s.overdueTasks,1);
 assert.equal(s.hearingsPast,1);assert.equal(s.hearingsFuture,1);
 assert.equal(s.hearingsUndated,1);assert.equal(s.hearingsCanceled,1);
});
test('consulta paginada inclui mais de mil processos sem cortar KPIs',async()=>{
 const rows=Array.from({length:1205},(_,i)=>({id:i+1}));let calls=0;
 const db={from:()=>({select:()=>({eq:()=>({order:()=>({range:async(a,b)=>{calls++;return {data:rows.slice(a,b+1)}}})})})})};
 assert.equal((await fetchCompanyRows(db,'processos','id','company')).length,1205);
 assert.equal(calls,3);
});
