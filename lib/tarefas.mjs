// Fila de contatos do CRM ProjectW1SC. Não presume que origem "QUITADOS" comprove quitação.
const ISO = /^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MS_DAY=86400000;
export const PRIORITY_OPTIONS = Object.freeze(['normal','alta','urgente']);
export function validateCriticidade(value){
 const priority=String(value||'normal').trim().toLowerCase();
 if(!PRIORITY_OPTIONS.includes(priority))throw new Error('Selecione um nível de criticidade válido.');
 return priority;
}
export function validateNote(value){
 const note=String(value||'').trim();
 if(note.length<3)throw new Error('A anotação precisa de pelo menos 3 caracteres.');
 if(note.length>4000)throw new Error('A anotação deve ter no máximo 4000 caracteres.');
 return note;
}

export const ATTENDANCE_CHANNELS = Object.freeze(['whatsapp','ligacao','email','presencial','outro']);
export const ATTENDANCE_OUTCOMES = Object.freeze(['contatado','sem_resposta','em_negociacao','aguardando_resposta','outro']);

export function validISO(value){
 if(typeof value!=='string'||!ISO.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 const d=new Date(Date.UTC(year,month-1,day));
 return d.getUTCFullYear()===year&&d.getUTCMonth()+1===month&&d.getUTCDate()===day;
}
export function todayBrazil(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type)?.value??'';
 return [get('year'),get('month'),get('day')].join('-');
}
export function daysUntil(value,today=todayBrazil()){
 if(!validISO(value)||!validISO(today))return null;
 const a=Date.parse(value+'T12:00:00Z'),b=Date.parse(today+'T12:00:00Z');
 return Math.round((a-b)/MS_DAY);
}
export function dueDate(client){
 const override=client?.due_override;
 if(validISO(override))return override;
 return validISO(client?.next_return)?client.next_return:null;
}
export function taskStatus(client,today=todayBrazil()){
 if(client?.workflow_status==='finalizado')return {code:'finalizado',label:'Finalizado',days:null,date:dueDate(client)};
 const date=dueDate(client);
 const days=daysUntil(date,today);
 if(days===null)return {code:'sem_data',label:'Sem data',days:null,date:null};
 if(days<0)return {code:'vencido',label:'Vencido',days,date};
 if(days===0)return {code:'hoje',label:'Vence hoje',days,date};
 return {code:'em_dia',label:'Em dia',days,date};
}
function priorityScore(client,today){
 const status=taskStatus(client,today);
 const base={vencido:4000,hoje:2500,em_dia:1200,sem_data:100,finalizado:-1000}[status.code]??0;
 const boost={urgente:900,alta:300,normal:0}[client.priority_level]||0;
 const days=status.days??0;
 const age=status.code==='vencido'?Math.min(180,-days)*10:status.code==='em_dia'?Math.max(0,180-Math.min(180,days)):0;
 const missingDateWarning=status.code==='sem_data'&&client.source_status==='vencido'?200:0;
 return base+boost+age+missingDateWarning;
}
export function sortTaskQueue(clients,today=todayBrazil()){
 return [...(clients||[])].sort((a,b)=>{
  const diff=priorityScore(b,today)-priorityScore(a,today);
  if(diff!==0)return diff;
  const da=dueDate(a)||'9999-12-31',db=dueDate(b)||'9999-12-31';
  if(da!==db)return da.localeCompare(db);
  return String(a.name||'').localeCompare(String(b.name||''),'pt-BR')||String(a.id||'').localeCompare(String(b.id||''));
 });
}
export function isAttendedToday(c,today=todayBrazil()){
 if(!c?.last_attendance_at)return false;
 const d=new Date(c.last_attendance_at);
 return !Number.isNaN(d.getTime())&&todayBrazil(d)===today;
}
export function queueCounts(clients,today=todayBrazil()){
 const out={vencido:0,hoje:0,em_dia:0,sem_data:0,finalizado:0,atendidos_hoje:0,active:0,urgentes:0,sem_data_origem_vencido:0};
 for(const c of clients||[]){
  const status=taskStatus(c,today);
  out[status.code]=(out[status.code]||0)+1;
  if(status.code!=='finalizado')out.active++;
  if(status.code!=='finalizado'&&c.priority_level==='urgente')out.urgentes++;
  if(status.code==='sem_data'&&c.source_status==='vencido')out.sem_data_origem_vencido++;
  if(isAttendedToday(c,today))out.atendidos_hoje++;
 }
 return out;
}
export function filterTaskQueue(clients,{view='prioridades',today=todayBrazil(),query='',priority='',institution=''}={}){
 const q=String(query).trim().toLocaleLowerCase('pt-BR');
 return sortTaskQueue((clients||[]).filter(c=>{
  const s=taskStatus(c,today).code;
  if(view==='prioridades'&&s==='finalizado')return false;
  if(view==='vencidos'&&s!=='vencido')return false;
  if(view==='hoje'&&s!=='hoje')return false;
  if(view==='em_dia'&&s!=='em_dia')return false;
  if(view==='sem_data'&&s!=='sem_data')return false;
  if(view==='finalizados'&&s!=='finalizado')return false;
  if(view==='atendidos'&&!isAttendedToday(c,today))return false;
  if(priority&&priority!=='todos'&&c.priority_level!==priority)return false;
  if(institution&&institution!=='todos'&&String(c.institution||'')!==institution)return false;
  if(q&&!([c.name,c.phone,c.institution,c.contacted_party,c.consultant,c.assigned_to].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(q))))return false;
  return true;
 }),today);
}
export function validateAttendance({body,channel,outcome,next_due}){
 const content=String(body||'').trim();
 if(content.length<5)throw new Error('Descreva o atendimento ou a tentativa de contato (pelo menos 5 caracteres).');
 if(content.length>4000)throw new Error('Resumo do atendimento muito longo.');
 if(!ATTENDANCE_CHANNELS.includes(channel))throw new Error('Selecione o canal utilizado.');
 if(!ATTENDANCE_OUTCOMES.includes(outcome))throw new Error('Selecione o resultado do atendimento.');
 if(next_due!==null&&next_due!==undefined&&next_due!==''&&!validISO(next_due))throw new Error('Informe uma data válida de próximo retorno.');
 return {body:content,channel,outcome,next_due:next_due||null};
}
