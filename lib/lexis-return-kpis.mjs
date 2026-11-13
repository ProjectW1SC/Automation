// Regra de retorno adaptada de W1CAPITAL/LexisPredict/src/lib/vencimentos.ts.
// proximo_prazo e um campo LEGADO; nao comprova retorno vencido nem prazo judicial.
const clean=x=>String(x??'').trim();
const upper=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const dayReg=/^\d{4}-\d{2}-\d{2}$/;
export function hasProcessNumber(r){
 const digits=clean(r?.protocolo_ref||r?.process_number).replace(/\D/g,'');
 return digits.length===20&&!/^0{20}$/.test(digits);
}
export function returnDate(x){
 const s=clean(x);
 if(!s||['-','—','0','00/00/0000'].includes(s)||s.includes('#'))return null;
 let value=null;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))value=s.slice(0,10);
 else {
  const br=s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if(br)value=br[3]+'-'+br[2]+'-'+br[1];
  else if(/^\d{5}(\.\d+)?$/.test(s)){
   const serial=Math.floor(Number(s));
   if(serial>=20000&&serial<=80000)value=new Date(Date.UTC(1899,11,30)+serial*86400000).toISOString().slice(0,10);
  }
 }
 if(!value||!dayReg.test(value))return null;
 const date=new Date(value+'T12:00:00Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
}
export function isLexisClosed(r={}){
 const data=r.dados&&typeof r.dados==='object'?r.dados:{};
 return [r.status_interno,data.status_interno,r.statusManual,data.statusManual,
  r.situacao,data.situacao,r.status,data.status].some(s=>
   /ENCERRAD|ARQUIVAD|ARQUIVAMENT|EXTINT|EXTINCAO|BAIXA DEFINITIVA|FINALIZAD|EXCLUID/.test(upper(s)));
}
export function classifyLexisReturn(row,today){
 const valid=hasProcessNumber(row);
 const next=returnDate(row?.proximo_retorno??row?.next_attendance??row?.proximoRetorno);
 const last=returnDate(row?.ultimo_retorno??row?.last_attendance??row?.ultimoRetorno);
 const closed=isLexisClosed({...row,status_interno:row?.status_interno??row?.status_detail});
 const basic={valid,next,last,closed,overdue:false,dueToday:false,next7:false,attended:false};
 if(!valid)return {...basic,status:'ignorado',label:'Sem numero CNJ'};
 if(closed)return {...basic,status:'encerrado',label:'Processo encerrado'};
 if(!next)return {...basic,status:'sem_data',label:'Sem proximo retorno'};
 // Mesma condicao Lexis: agendamento so vence se ultimo retorno for anterior ao proximo.
 if(last&&last>=next)return {...basic,status:'atendido',attended:true,label:'Retorno ja atendido'};
 if(!dayReg.test(String(today)))return {...basic,status:'em_dia',label:'Em dia'};
 const diff=Math.round((Date.parse(next+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
 if(diff<0)return {...basic,status:'vencido',overdue:true,label:'Retorno vencido'};
 return {...basic,status:diff<=3?'atencao':'em_dia',dueToday:diff===0,next7:diff<=7,
  label:diff===0?'Retorno hoje':diff<=3?'Retorno proximo':'Em dia'};
}
export function summarizeLexisReturns(rows=[],today){
 const result={processes:0,excludedNoCnj:0,active:0,closed:0,
  scheduled:0,overdue:0,today:0,next7:0,attended:0,noDate:0};
 for(const row of rows){
  const c=classifyLexisReturn(row,today);
  if(!c.valid){result.excludedNoCnj++;continue}
  result.processes++;
  if(c.closed){result.closed++;continue}
  result.active++;
  if(!c.next){result.noDate++;continue}
  result.scheduled++;
  if(c.overdue)result.overdue++;
  if(c.dueToday)result.today++;
  if(c.next7)result.next7++;
  if(c.attended)result.attended++;
 }
 return result;
}
