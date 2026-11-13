import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyLexisReturn,hasProcessNumber,returnDate,summarizeLexisReturns} from '../lib/lexis-return-kpis.mjs';
import {buildLexisEvents} from '../lib/lexis-operations.mjs';
const today='2026-11-13';
const cnj='0000123-45.2026.8.26.0001';
const row=(id,more={})=>({id,protocolo_ref:cnj,status:'No Prazo',status_interno:'EM ANDAMENTO',...more});
test('sem CNJ ou número incompleto é excluído dos KPIs',()=>{
 assert.equal(hasProcessNumber(row(1)),true);
 assert.equal(hasProcessNumber(row(2,{protocolo_ref:''})),false);
 assert.equal(hasProcessNumber(row(3,{protocolo_ref:'12345'})),false);
 assert.equal(hasProcessNumber(row(4,{protocolo_ref:'00000000000000000000'})),false);
 assert.equal(classifyLexisReturn(row(1,{protocolo_ref:'',proximo_retorno:'2026-10-01'}),today).status,'ignorado');
});
test('o último atendimento resolve retorno agendado e não gera atraso',()=>{
 const past=row(1,{proximo_retorno:'2026-11-10',ultimo_retorno:'2026-11-09'});
 const same=row(2,{proximo_retorno:'2026-11-10',ultimo_retorno:'2026-11-10'});
 const after=row(3,{proximo_retorno:'2026-11-10',ultimo_retorno:'2026-11-12'});
 const closed=row(4,{proximo_retorno:'2026-11-10',status_interno:'ENCERRADO'});
 const legacy=row(5,{proximo_prazo:'2026-05-20',proximo_retorno:'2026-11-20'});
 assert.equal(classifyLexisReturn(past,today).status,'vencido');
 assert.equal(classifyLexisReturn(same,today).status,'atendido');
 assert.equal(classifyLexisReturn(after,today).status,'atendido');
 assert.equal(classifyLexisReturn(closed,today).status,'encerrado');
 assert.equal(classifyLexisReturn(legacy,today).status,'em_dia');
 assert.equal(summarizeLexisReturns([past,same,after,closed,legacy],today).overdue,1);
});
test('normalização de datas evita valores inválidos e mantém a data civil',()=>{
 assert.equal(returnDate('2026-11-13T00:00:00Z'),'2026-11-13');
 assert.equal(returnDate('13/11/2026'),'2026-11-13');
 assert.equal(returnDate('31/02/2026'),null);
 assert.equal(returnDate('00/00/0000'),null);
 assert.equal(classifyLexisReturn(row(6,{proximo_retorno:'2026-11-13'}),today).dueToday,true);
});
test('lista e KPI de vencidos são idênticos, sem proximo_prazo legado',()=>{
 const processes=[
  row(1,{proximo_retorno:'2026-11-02'}),
  row(2,{proximo_retorno:'2026-11-02',ultimo_retorno:'2026-11-03'}),
  row(3,{proximo_retorno:'2026-11-03',protocolo_ref:null}),
  row(4,{proximo_retorno:'2026-11-05',status_interno:'ENCERRADO'}),
  row(5,{proximo_prazo:'2026-10-10',proximo_retorno:'2026-11-20'})
 ];
 const events=buildLexisEvents({processes,today});
 assert.equal(events.filter(x=>x.kind==='retorno'&&x.status==='vencido').length,1);
 assert.equal(events.filter(x=>x.kind==='retorno'&&x.status==='vencido').length,summarizeLexisReturns(processes,today).overdue);
 assert.equal(events.some(x=>x.kind==='prazo'),false);
});

test('cartoes da carteira usam o mesmo criterio com dados mapeados',()=>{
 const mapped={process_number:cnj,status:'em_andamento',status_detail:'EM ANDAMENTO',next_attendance:'2026-11-10',last_attendance:'2026-11-12'};
 assert.equal(classifyLexisReturn(mapped,today).status,'atendido');
 assert.equal(classifyLexisReturn({...mapped,last_attendance:'2026-11-01'},today).status,'vencido');
});
