import {sortTaskQueue,taskStatus} from './tarefas.mjs';
const label={normal:'Normal',alta:'Alta',urgente:'Urgente'};
export const priorityLabel=value=>label[value]||'Normal';
export function limitSnippet(value,max=120){
 const text=String(value||'').replace(/\s+/g,' ').trim();
 return text.length>max?text.slice(0,Math.max(0,max-1)).trimEnd()+'…':text;
}
const activityLabels={atendimento:'Atendimento',registro_atendimento:'Atendimento',atendimento_registrado:'Atendimento',edicao:'Edição',situacao:'Mudança de situação'};
function timestamp(row,field='created_at'){
 const value=String(row?.[field]||'');
 const date=Date.parse(value);
 return Number.isNaN(date)?0:date;
}
function latest(rows){
 return [...rows].sort((a,b)=>b.millis-a.millis||a.text.localeCompare(b.text,'pt-BR'))[0]||null;
}
// Alinha exatamente a classificação à fila /tarefas, sem inventar observações.
// Registro de anotação não é confundido com contato realizado.
export function priorityDigest({clients=[],audit=[],manual=[],today,scope='empresa',actorId=null,limit=10}={}){
 const valid=(c)=>c&&c.workflow_status!=='finalizado';
 return sortTaskQueue(clients.filter(valid),today).slice(0,Math.max(0,Math.min(10,limit))).map(c=>{
  const logs=audit.filter(a=>a.client_id===c.id&&(scope!=='meus'||a.actor_id===actorId));
  const completed=manual.filter(a=>a.client_id===c.id&&(scope!=='meus'||a.actor_id===actorId)&&a.deleted_at==null);
  const note=latest(logs.filter(a=>a.kind==='anotacao').map(a=>({
   text:String(a.body||'').trim(),millis:timestamp(a),date:a.created_at
  })).filter(x=>x.text));
  const auditWork=logs.filter(a=>a.kind!=='anotacao'&&String(a.body||'').trim()).map(a=>({
   text:String(a.body).trim(),millis:timestamp(a),date:a.created_at,
   source:activityLabels[a.kind]||'Atividade'
  }));
  const manualWork=completed.map(a=>({
   text:[String(a.title||'').trim(),String(a.description||'').trim()].filter(Boolean).join(' — '),
   millis:timestamp(a)||timestamp({created_at:a.performed_on+'T12:00:00Z'}),
   date:a.created_at||a.performed_on,source:'Atividade registrada'
  })).filter(a=>a.text);
  const work=latest([...auditWork,...manualWork]);
  const status=taskStatus(c,today);
  return {id:c.id,name:String(c.name||'Cliente sem identificação'),institution:String(c.institution||''),
   priority:c.priority_level||'normal',priorityText:priorityLabel(c.priority_level),status:status.code,
   statusLabel:status.label,overdueDays:status.code==='vencido'?-status.days:0,
   due:status.date||null,responsible:String(c.assigned_to||c.consultant||''),
   note:note?.text||String(c.notes||'').trim(),noteAt:note?.date||null,
   lastActivity:work?.text||'',activityAt:work?.date||null,activitySource:work?.source||null
  };
 });
}
