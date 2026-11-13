// Indicadores somente de cadastros internos; não representam consulta/validação em tribunais.
const day=value=>/^(?:19|20)\d\d-\d\d-\d\d$/.test(String(value??'').slice(0,10))?String(value).slice(0,10):'';
const byDate=(key)=>(a,b)=>day(a[key]).localeCompare(day(b[key]))||String(a.id||'').localeCompare(String(b.id||''));

export function buildOperationalFocus({deadlines=[],clients=[],cases=[]}={},today){
 const reference=day(today);
 if(!reference)throw new TypeError('Data de referência inválida.');
 const open=deadlines.filter(row=>row?.status==='aberto'&&day(row.due_on));
 return {
  asOf:reference,
  overdue:open.filter(row=>day(row.due_on)<reference).sort(byDate('due_on')),
  today:open.filter(row=>day(row.due_on)===reference).sort(byDate('due_on')),
  returns:clients.filter(row=>row?.status==='ativo'&&day(row.next_return)&&day(row.next_return)<=reference).sort(byDate('next_return')),
  reviews:cases.filter(row=>row?.status==='ativo'&&day(row.next_review)&&day(row.next_review)<=reference).sort(byDate('next_review')),
  futureHearings:open.filter(row=>row.kind==='audiencia'&&day(row.due_on)>=reference).sort(byDate('due_on')),
 };
}
