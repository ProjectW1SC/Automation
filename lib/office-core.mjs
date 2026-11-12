// Planejamento e validação operacional do escritório, sem supor decisão judicial.
export const OFFICE_AGENTS=Object.freeze([
 {id:'hermes',name:'Hermes Scanner',role:'Revisão assistida das consultas DataJud e DJEN e sugestão de próxima revisão',mode:'oficial'},
 {id:'mini',name:'Mini Agent',role:'Triagem diária de tarefas e pendências',mode:'deterministico'},
 {id:'tribunais',name:'Tribunais',role:'Acompanhamento DataJud/DJEN (consulta sob demanda)',mode:'oficial'},
 {id:'prazos',name:'Prazos',role:'Prioridades e alertas de vencimento',mode:'deterministico'},
 {id:'audiencias',name:'Audiências',role:'Organização de atos e datas confirmadas',mode:'deterministico'},
 {id:'pecas',name:'Peças',role:'Minutas com base no processo e revisão humana',mode:'modelo-opcional'},
 {id:'pesquisa',name:'Pesquisa jurídica',role:'Conferência e indicação de lacunas de fundamentos',mode:'modelo-opcional'},
 {id:'whatsapp',name:'WhatsApp',role:'Rascunhos de atendimento, sem envio automático',mode:'modelo-opcional'},
 {id:'posvenda',name:'Pós-atendimento',role:'Sugestões de retorno para clientes',mode:'deterministico'},
 {id:'leads',name:'Leads',role:'Qualificação de contatos autorizados',mode:'deterministico'},
 {id:'auditoria',name:'Auditoria',role:'Trilha das ações e dados de origem',mode:'deterministico'}
]);
export const OFFICE_DOC_TYPES=Object.freeze([
 {id:'peticao_inicial',label:'Petição inicial'},{id:'contestacao',label:'Contestação'},
 {id:'recurso',label:'Recurso'},{id:'manifestacao',label:'Manifestação'},
 {id:'procuracao',label:'Procuração'},{id:'contrato',label:'Contrato'},
 {id:'relatorio',label:'Relatório jurídico'},{id:'outro',label:'Outra peça'}
]);
const norm=(x,n=500)=>String(x??'').replace(/[<>]/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function normalizeOfficeCNJ(value){
 const v=norm(value,40);if(!v)return null;
 const digits=v.replace(/\D/g,'');if(!/^\d{20}$/.test(digits))throw new Error('CNJ deve conter exatamente 20 dígitos.');
 return digits.slice(0,7)+'-'+digits.slice(7,9)+'.'+digits.slice(9,13)+'.'+digits.slice(13,14)+'.'+digits.slice(14,16)+'.'+digits.slice(16,20);
}
export function validateOfficeDay(raw){
 const value=norm(raw,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Informe uma data válida.');
 const d=new Date(value+'T12:00:00.000Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error('Data de calendário inválida.');
 return value;
}
export function todaySP(date=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function daysUntil(iso,today=todaySP()){
 validateOfficeDay(iso);validateOfficeDay(today);
 return Math.round((Date.parse(iso+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
}
export function deadlineState(item,today=todaySP()){
 if(item.status!=='aberto')return item.status==='concluido'?'concluido':'cancelado';
 const d=daysUntil(item.due_on,today);
 return d<0?'vencido':d===0?'hoje':d<=7?'semana':'futuro';
}
export function officeMiniReview({clients=[],cases=[],deadlines=[],leads=[],messages=[]},today=todaySP()){
 const open=deadlines.filter(x=>x.status==='aberto');
 const overdue=open.filter(x=>deadlineState(x,today)==='vencido');
 const todayRows=open.filter(x=>deadlineState(x,today)==='hoje');
 const soon=open.filter(x=>deadlineState(x,today)==='semana');
 const unverified=open.filter(x=>!x.verified&&['prazo','audiencia'].includes(x.kind));
 const inbound=messages.filter(x=>x.direction==='inbound');
 const pendingClientReturns=clients.filter(x=>x.status==='ativo'&&x.next_return&&daysUntil(x.next_return,today)<=0);
 const pendingCaseReviews=cases.filter(x=>x.status==='ativo'&&x.next_review&&daysUntil(x.next_review,today)<=0);
 const actions=[
  ...overdue.slice(0,5).map(x=>({kind:'prazo_vencido',id:x.id,title:x.title,date:x.due_on,priority:'urgente'})),
  ...todayRows.slice(0,5).map(x=>({kind:'prazo_hoje',id:x.id,title:x.title,date:x.due_on,priority:'alta'})),
  ...unverified.slice(0,5).map(x=>({kind:'verificar_fonte',id:x.id,title:x.title,date:x.due_on,priority:'alta'})),
  ...pendingClientReturns.slice(0,5).map(x=>({kind:'retorno_cliente',id:x.id,title:x.name,date:x.next_return,priority:'alta'})),
  ...pendingCaseReviews.slice(0,5).map(x=>({kind:'revisao_processo',id:x.id,title:x.title,date:x.next_review,priority:'alta'}))
 ];
 return {asOf:today,counts:{clients:clients.length,cases:cases.length,deadlines:open.length,overdue:overdue.length,today:todayRows.length,week:soon.length,unverified:unverified.length,leads:leads.length,received:inbound.length,returnDue:pendingClientReturns.length,reviewDue:pendingCaseReviews.length},
 actions,notes:['As datas foram cadastradas na carteira; a contagem NÃO valida prazo judicial.','Nenhum envio, protocolo ou consulta a tribunal foi realizado pelo Mini Agent.'],performedActions:[]};
}
export function makePetitionSkeleton({kind='manifestacao',caseRecord,client,instructions='',evidence=[]}){
 const type=OFFICE_DOC_TYPES.find(x=>x.id===kind);
 if(!type)throw new Error('Tipo de peça inválido.');
 if(!caseRecord?.id)throw new Error('Selecione um processo cadastrado.');
 const number=caseRecord.process_number||'[NÚMERO CNJ A CONFERIR]';
 const court=norm(caseRecord.tribunal,140)||'[JUÍZO COMPETENTE A CONFERIR]';
 const name=norm(client?.name,160)||'[QUALIFICAÇÃO DA PARTE A CONFERIR]';
 const subject=norm(caseRecord.subject||caseRecord.title,220)||'[OBJETO A CONFERIR]';
 const notes=norm(instructions,1500);
 const verified=(evidence||[]).filter(x=>x?.source&&x?.checked_at).slice(0,8);
 const refs=verified.length?verified.map(e=>'- '+norm(e.source,25)+' · '+norm(e.checked_at,40)+' · '+norm(e.summary,200)).join('\n'):'[NENHUMA CONSULTA OFICIAL COMPROVADA NO HISTÓRICO]';
 const body=[
  'MINUTA DE '+type.label.toLocaleUpperCase('pt-BR')+' — REVISÃO OBRIGATÓRIA',
  '',
  'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO / RELATOR(A) DO(A) '+court,
  'Processo nº '+number,
  'Parte: '+name,
  'Assunto: '+subject,
  '',
  'I — DOS FATOS',
  '[INSERIR E CONFERIR FATOS DOCUMENTADOS NOS AUTOS — NÃO PRESUMIDOS PELA IA.]',
  notes?'Orientações do operador para conferência: '+notes:'',
  '',
  'II — DOS FUNDAMENTOS JURÍDICOS',
  '[INDICAR LEGISLAÇÃO, JURISPRUDÊNCIA E TRECHOS AUTÊNTICOS COM CONFERÊNCIA DE VIGÊNCIA E PERTINÊNCIA.]',
  '',
  'III — DOS PEDIDOS',
  '[DISCRIMINAR PEDIDOS CONFORME A FASE E OS DOCUMENTOS DO PROCESSO.]',
  '',
  'DOCUMENTOS / EVIDÊNCIAS DISPONÍVEIS NO SISTEMA',
  refs,
  '',
  '[LOCAL], [DATA].',
  '[ADVOGADO(A) RESPONSÁVEL] — OAB [UF/NÚMERO]',
  '',
  'Aviso interno: minuta não revisada. Não protocolar sem conferência do advogado.'
 ].filter(x=>x!==undefined).join('\n');
 return {title:type.label+' · '+number,kind:kind,body,evidence:{cnj:number,court,sourceCount:verified.length,checkedSources:verified.map(x=>({source:x.source,checked_at:x.checked_at}))}};
}
export function buildWhatsAppSuggestion(input){
 const name=norm(input?.display_name,70).split(' ')[0];
 const prefix='Olá'+(name?', '+name:'')+'! ';
 const raw=norm(input?.body,200).toLowerCase();
 if(/audi[eê]ncia|prazo|intima[cç][aã]o|senten[cç]a|andamento|processo/.test(raw))
  return prefix+'Recebi sua mensagem. Vou conferir os registros do seu processo e retorno com as informações confirmadas.';
 return prefix+'Recebi sua mensagem. Vou verificar sua solicitação e retorno com as informações disponíveis.';
}
export function canReplyWhatsApp(lastInbound,now=new Date()){
 const t=Date.parse(lastInbound);return Number.isFinite(t)&&now.getTime()>=t&&now.getTime()-t<24*60*60*1000;
}
