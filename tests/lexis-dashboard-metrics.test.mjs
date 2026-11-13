import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeLexisDashboard} from '../lib/lexis-dashboard-metrics.mjs';
import {fetchCompanyRows} from '../lib/lexis-company-data.mjs';
test('respeita separação de prazos, audiências, retornos e arquivados',()=>{
 const s=summarizeLexisDashboard({today:'2026-11-13',
  processes:[{id:1,status_interno:'EM ANDAMENTO',proximo_prazo:'2026-11-10',proximo_retorno:'2026-11-20'},{id:2,status_interno:'ENCERRADO',proximo_prazo:'2026-11-08'}],
  hearings:[{id:1,situacao:'publicada',data_evento:'2026-11-08'},{id:2,situacao:'data_pendente',data_evento:null},{id:3,situacao:'informada',data_evento:'2026-11-20'},{id:4,situacao:'cancelada',data_evento:null}],
  tasks:[{id:'t',feito:false,titulo:'Revisar',due_at:'2026-11-12'}]});
 assert.equal(s.processes,2);assert.equal(s.active,1);assert.equal(s.overdueDeadlines,1);
 assert.equal(s.overdueTasks,1);assert.equal(s.overdueReturns,0);assert.equal(s.overdueTotal,2);
 assert.equal(s.hearingsPast,1);assert.equal(s.hearingsFuture,1);assert.equal(s.hearingsUndated,1);assert.equal(s.hearingsCanceled,1);
});
test('paginação consulta todos os registros da empresa',async()=>{
 const rows=Array.from({length:1205},(_,i)=>({id:i+1}));let calls=0;
 const db={from:()=>({select:()=>({eq:()=>({order:()=>({range:async(a,b)=>{calls++;return {data:rows.slice(a,b+1)}}})})})})};
 assert.equal((await fetchCompanyRows(db,'processos','id','company')).length,1205);assert.equal(calls,3);
});
