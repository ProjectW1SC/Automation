import {validISO} from './tarefas.mjs';
export const ACTIVITY_CATEGORIES=Object.freeze([
 {value:'atendimento',label:'Atendimento'},
 {value:'analise_processual',label:'Análise de processo'},
 {value:'auditoria',label:'Auditoria'},
 {value:'dossie',label:'Dossiê'},
 {value:'investigacao',label:'Investigação'},
 {value:'planilha',label:'Planilha'},
 {value:'sistema',label:'Sistema'},
 {value:'automacao',label:'Automação'},
 {value:'outro',label:'Outra'},
]);
export const categoryLabel=id=>ACTIVITY_CATEGORIES.find(x=>x.value===id)?.label||'Outra';
export const PROCESS_TYPES=Object.freeze([
 {value:'comum',label:'Processo comum'},
 {value:'busca_apreensao',label:'Busca e apreensão'}
]);
export const processTypeLabel=kind=>PROCESS_TYPES.find(x=>x.value===kind)?.label||'Não informado';
export function formatCNJ(raw){
 const text=String(raw??'').trim();
 if(!text)return null;
 if(!/^[0-9\s.\-/]+$/.test(text))throw new Error('Informe um número CNJ válido, sem letras.');
 const digits=text.replace(/\D/g,'');
 if(digits.length!==20)throw new Error('O número CNJ deve conter 20 dígitos.');
 return digits.slice(0,7)+'-'+digits.slice(7,9)+'.'+digits.slice(9,13)+'.'+digits.slice(13,14)+'.'+digits.slice(14,16)+'.'+digits.slice(16,20);
}
export function validateCompletedActivity(input,today){
 const title=String(input.title||'').trim();
 const description=String(input.description||'').trim();
 const category=String(input.category||'outro');
 const date=String(input.date||'');
 const contactConfirmed=Boolean(input.contactConfirmed);
 if(title.length<4||title.length>180)throw new Error('O título precisa ter de 4 a 180 caracteres.');
 if(description.length>4000)throw new Error('A descrição ultrapassou o limite de 4000 caracteres.');
 if(!ACTIVITY_CATEGORIES.some(c=>c.value===category))throw new Error('Selecione uma categoria válida.');
 if(!validISO(date)||date<'2020-01-01')throw new Error('Data de execução inválida.');
 if(date>today)throw new Error('Não é possível registrar uma atividade com data futura.');
 if(contactConfirmed&&category!=='atendimento')throw new Error('Marque contato confirmado apenas para um atendimento real.');
 const id=input.clientId||null;
 if(id!==null&&!/^[a-f0-9-]{36}$/i.test(String(id)))throw new Error('Selecione um cliente válido.');
 const processNumber=formatCNJ(input.processNumber??input.process_number??'');
 const processType=String(input.processType??input.process_type??'').trim();
 if(processNumber&&!PROCESS_TYPES.some(x=>x.value===processType))throw new Error('Selecione o tipo do processo.');
 if(!processNumber&&processType)throw new Error('Informe o número do processo para escolher o tipo.');
  const durationSeconds=Number(input.durationSeconds||0);
 if(!Number.isInteger(durationSeconds)||durationSeconds<0||durationSeconds>86400)throw new Error('Tempo informado inválido.');
 return {title,description,category,performed_on:date,client_id:id,contact_confirmed:contactConfirmed,duration_seconds:durationSeconds,process_number:processNumber,process_type:processType||null,origin:'registro_manual_autodeclarado'};
}
export function activitySummary(records,actorId){
 const filtered=(records||[]).filter(x=>x.actor_id===actorId);
 return {total:filtered.length,contacts:filtered.filter(x=>x.contact_confirmed).length,clients:new Set(filtered.map(x=>x.client_id).filter(Boolean)).size,withoutClient:filtered.filter(x=>!x.client_id).length,durationSeconds:filtered.reduce((n,x)=>n+Number(x.duration_seconds||0),0)};
}
export function paginateActivities(records,page=1,size=50){
 const p=Math.max(1,Math.floor(Number(page)||1));
 const take=Math.max(1,Math.min(100,Math.floor(Number(size)||50)));
 const total=records.length;
 const pages=Math.max(1,Math.ceil(total/take));
 const current=Math.min(p,pages);
 return {rows:records.slice((current-1)*take,current*take),page:current,pages,total};
}
export function toCsvCell(raw){
 const t=String(raw??'');
 const safe=/^[=+\-@\t\r]/.test(t)?"'"+t:t;
 return '"'+safe.replace(/"/g,'""')+'"';
}

export function toActivityUpdate(input,today){
 const {origin,...patch}=validateCompletedActivity(input,today);
 return patch;
}
