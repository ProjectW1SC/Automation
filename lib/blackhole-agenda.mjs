import {hearingCandidates} from './judicial-triage.mjs';
const ISO=/^20\d{2}-\d{2}-\d{2}$/;
function isoDate(value){
 const s=String(value||'').trim();
 if(ISO.test(s)){
  const d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s?s:null;
 }
 const br=/^([0-3]\d)\/([01]\d)\/(20\d{2})$/.exec(s);
 if(br)return isoDate(br[3]+'-'+br[2]+'-'+br[1]);
 return null;
}
const closed=value=>/(encerr|arquiv|baixad|finaliz|extint|cancelad)/i.test(String(value||''));
const active=value=>!/(inativ|cancelad|encerr|arquiv|baixad)/i.test(String(value||''));
const completed=value=>['concluido','finalizado','completed','done','resolvido'].includes(String(value||'').toLowerCase());
const digits=value=>String(value||'').replace(/\D/g,'');
const dateText=value=>isoDate(value)||null;
function eventRow(row,kind,date,client,cases,extra={}){
 const legalCase=cases.find(c=>c.id===row.case_id)||cases.find(c=>c.id===row.id)||null;
 const linkedClient=client|| (legalCase?null:null);
 const clientName=linkedClient?.name||extra.clientName||'';
 return {
  id:String(extra.id||row.id||('event-'+kind+'-'+date+'-'+(row.title||''))),
  kind,date,title:String(extra.title||row.title||row.type||'Compromisso').slice(0,180),
  subtitle:String(extra.subtitle||row.process_number||legalCase?.process_number||'').slice(0,260)||null,
  clientName,clientId:linkedClient?.id||row.client_id||null,
  caseId:legalCase?.id||row.case_id||null,
  processNumber:extra.processNumber||legalCase?.process_number||row.process_number||null,
  tribunal:extra.tribunal||legalCase?.tribunal||null,
  status:extra.status||row.status||null,
  priority:row.priority||'normal',verified:extra.verified??!!row.verified,
  source:extra.source||row.source||null,sourceUrl:extra.sourceUrl||row.source_url||null,
  evidence:extra.evidence||row.notes||null,time:extra.time||null,
  overdue:kind==='prazo'&&date<extra.today,
  allDay:!extra.time,origin:extra.origin||'crm'
 };
}
export function weekDates(value){
 const iso=isoDate(value);if(!iso)throw new Error('Data da agenda inválida.');
 const d=new Date(iso+'T12:00:00');const offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset);
 return Array.from({length:7},(_,i)=>{const x=new Date(d);x.setDate(d.getDate()+i);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')});
}
export function buildAgendaEvents({deadlines=[],clients=[],cases=[],snapshots=[],today}={}){
 const ref=isoDate(today);if(!ref)throw new Error('Data de referência da agenda inválida.');
 const out=[],seen=new Set(),clientById=new Map(clients.map(c=>[c.id,c])),caseById=new Map(cases.map(c=>[c.id,c]));
 const activeCases=cases.filter(c=>active(c.status));
 const caseByNumber=new Map(activeCases.map(c=>[digits(c.process_number),c]).filter(([k])=>k));
 const push=(row,kind,date,client,extra={})=>{
  if(!date)return;
  const legalCase=row.case_id?caseById.get(row.case_id):null;
  if(legalCase&&closed(legalCase.status)&&kind!=='atendido')return;
  const process=extra.processNumber||legalCase?.process_number||row.process_number||'';
  const key=String(kind)+'|'+String(date)+'|'+digits(process)+'|'+String(extra.time||'');
  if(seen.has(key))return;seen.add(key);
  out.push(eventRow(row,kind,date,client,cases,{...extra,processNumber:process,today:ref}));
 };
 for(const row of deadlines){
  const due=isoDate(row.due_on);if(!due||row.status==='cancelado')continue;
  if(row.kind==='audiencia'&&due<ref)continue;
  const kind=completed(row.status)?'atendido':(['prazo','audiencia','retorno','tarefa'].includes(row.kind)?row.kind:'tarefa');
  const client=clientById.get(row.client_id)||null;
  const caseRow=caseById.get(row.case_id)||null;
  push({...row,process_number:caseRow?.process_number||null},kind,
   kind==='atendido'?isoDate(row.completed_at)||due:due,client,
   {id:row.id,title:row.title,subtitle:caseRow?.process_number||row.source||null,verified:!!row.verified,source:row.source,sourceUrl:row.source_url,origin:'deadline'});
 }
 for(const client of clients){
  const date=isoDate(client.next_return);
  if(!date||!active(client.status))continue;
  push({id:'return-'+client.id,title:'Retorno · '+client.name,client_id:client.id},'retorno',date,client,
   {id:'return-'+client.id,title:'Retorno · '+client.name,subtitle:client.responsible||'Retorno cadastrado',origin:'client'});
 }
 for(const legalCase of activeCases){
  const date=isoDate(legalCase.next_review);
  if(!date)continue;
  const client=clientById.get(legalCase.client_id)||null;
  push({id:'review-'+legalCase.id,title:'Revisar processo · '+legalCase.title,case_id:legalCase.id},'tarefa',date,client,
   {id:'review-'+legalCase.id,title:'Revisar processo · '+legalCase.title,subtitle:legalCase.process_number||legalCase.tribunal||'Revisão cadastrada',origin:'case'});
 }
 // Novidades só entram quando a própria publicação contém uma data do ato.
 const noveltySeen=new Set();
 for(const snap of [...snapshots].sort((a,b)=>String(b.checked_at||'').localeCompare(String(a.checked_at||'')))){
  const cnj=digits(snap.process_number),legalCase=caseByNumber.get(cnj);if(!cnj||!legalCase||closed(legalCase.status))continue;
  for(const item of snap.payload?.items||[]){
   const date=isoDate(item?.date||item?.data||item?.dataMovimento);
   const title=String(item?.title||item?.titulo||'').trim();
   if(!date||!title||/audi[êe]ncia/i.test(title))continue;
   const key=cnj+'|'+date+'|'+title.toLowerCase();if(noveltySeen.has(key))continue;noveltySeen.add(key);
   const client=clientById.get(legalCase.client_id)||null;
   push({id:'novelty-'+key,title:client?.name||legalCase.title,case_id:legalCase.id},'novidade',date,client,
    {id:'novelty-'+key,title:client?.name||legalCase.title,subtitle:title,processNumber:legalCase.process_number,
     tribunal:legalCase.tribunal,source:item.source||snap.source,sourceUrl:item.link||null,evidence:item.description||title,
     verified:true,origin:'snapshot'});
  }
 }
 // Candidatos de audiência precisam ter data expressa no texto; nunca usar a data da publicação.
 for(const hearing of hearingCandidates(snapshots,ref)){
  const legalCase=caseByNumber.get(digits(hearing.process_number));if(!legalCase||closed(legalCase.status))continue;
  const client=clientById.get(legalCase.client_id)||null;
  push({id:'official-hearing-'+hearing.process_number+'-'+hearing.date+'-'+(hearing.time||''),title:client?.name||legalCase.title,case_id:legalCase.id},'audiencia',hearing.date,client,
   {id:'official-hearing-'+hearing.process_number+'-'+hearing.date+'-'+(hearing.time||''),title:client?.name||legalCase.title,
    subtitle:hearing.type+(hearing.time?' · '+hearing.time:''),processNumber:hearing.process_number,tribunal:legalCase.tribunal,
    time:hearing.time,source:hearing.source,sourceUrl:hearing.link,evidence:hearing.evidence,
    verified:false,status:'Possível agendamento — conferir no tribunal',origin:'snapshot'});
 }
 return out.sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
}
export function agendaStats(events=[],today){
 const ref=isoDate(today);if(!ref)throw new Error('Data de referência inválida.');
 const dates=weekDates(ref),set=new Set(dates),week=events.filter(e=>set.has(e.date));
 const count=kind=>week.filter(e=>e.kind===kind).length;
 return {
  prazos:count('prazo'),prazosHoje:events.filter(e=>e.kind==='prazo'&&e.date===ref).length,
  vencidos:week.filter(e=>e.kind==='prazo'&&e.date<ref).length,
  audiencias:count('audiencia'),retornos:count('retorno'),novidades:count('novidade'),
  tarefas:count('tarefa'),atendidos:count('atendido'),total:week.length
 };
}
