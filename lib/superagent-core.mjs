import {lexisLegalFindings,lexisAgentQuality} from './lexis-hermes-engine.mjs';
// Núcleo seguro refatorado das diretrizes LexisPredict / superagente: evidência, roteiro e escopo.
// Não é LLM; é um plano operacional verificável sem API paga ou envio automático.
const clean=(v,n=360)=>String(v??'').replace(/<[^>]+>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function superAgentTask(raw){
 const t=clean(raw,1800).toLowerCase();
 if(/whatsapp|mensagem|responder|retorno ao cliente|atendimento|falar com cliente/.test(t))return'atendimento';
 if(/dossi[eê]|linha do tempo|cronologia/.test(t))return'dossie';
 if(/investiga|auditori|irregularidad|omiss[aã]o|apurar/.test(t))return'investigacao';
 if(/relat[oó]rio|indicador|kpi|produtividade/.test(t))return'relatorio';
 if(/processo|cnj|datajud|djen|tribunal|senten[cç]a|audi[eê]ncia|proced[eê]n|recurso/.test(t))return'analise-processual';
 return'geral';
}
export function targetCNJ(raw){
 const m=clean(raw,1800).match(/\b\d{7}[-.\s]?\d{2}[-.\s]?\d{4}[-.\s]?\d[-.\s]?\d{2}[-.\s]?\d{4}\b/);
 return m?m[0].replace(/\D/g,''):null;
}
export function buildSuperAgentReview(prompt,{processes=[],snapshots=[],clients=[],leads=[]}={}){
 const task=superAgentTask(prompt),target=targetCNJ(prompt);
 const selected=target?processes.filter(p=>clean(p.process_number,50).replace(/\D/g,'')===target):processes;
 const scopedNumbers=new Set(selected.map(p=>clean(p.process_number,50)));
 const docs=snapshots.filter(s=>scopedNumbers.has(s.process_number)&&(!target||clean(s.process_number,50).replace(/\D/g,'')===target));
 const bySource=[...new Set(docs.map(s=>s.source.toUpperCase()))];
 const events=docs.flatMap(s=>(Array.isArray(s.payload?.items)?s.payload.items:[]).map(i=>({
  number:s.process_number,source:clean(i.source||s.source,35),date:clean(i.date,40),
  text:clean(i.title||i.description,230),checked_at:clean(s.checked_at,40)
 }))).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
 let note='';
 if(target&&!selected.length)note='O CNJ informado não foi encontrado na carteira autorizada. Nenhuma consulta judicial foi presumida.';
 else if(target&&!docs.length)note='O processo está cadastrado, mas não há consulta oficial registrada. Use Processos para consultar DataJud/DJEN.';
 else if(!target)note='Visão da carteira autorizada; para um caso específico, selecione o processo no CRM.';
 else note='Os registros abaixo vêm de consultas anteriores, não equivalem a uma nova leitura do tribunal.';
 const findings=lexisLegalFindings(events);
 const quality=lexisAgentQuality({findings,sourceStatus:bySource,events});
 const title={atendimento:'Rascunho de atendimento — requer revisão',dossie:'Dossiê de evidências',investigacao:'Investigação de registros',relatorio:'Relatório da carteira', 'analise-processual':'Revisão processual',geral:'Plano operacional'}[task];
 const stats={processes:selected.length,clients:clients.length,leads:leads.length,storedChecks:docs.length};
 const lines=[title,note,
  'Escopo: '+stats.processes+' processos, '+stats.clients+' clientes e '+stats.leads+' leads visíveis; '+stats.storedChecks+' consultas oficiais armazenadas.',
  'Fontes encontradas: '+(bySource.join(', ')||'nenhuma')+'.',
  ...events.slice(0,5).map(e=>e.number+' · '+(e.date||'sem data')+' · '+e.source+' · '+e.text),
  ...(findings.verdict?['Indício de veredito: '+findings.verdict.value+' · '+findings.verdict.source+' · '+(findings.verdict.date||'data não informada')+' (revisar inteiro teor)']:[]),
  ...(findings.enforcement?['Cumprimento/execução: '+findings.enforcement.value+' · '+findings.enforcement.source]:[]),
  ...(findings.attorneyFees?['Honorários sucumbenciais mencionados: '+(findings.attorneyFees.percentage===null?'percentual não confirmado':findings.attorneyFees.percentage+'%')]:[]),
  ...(findings.legalAid?['Justiça gratuita: '+findings.legalAid.value+' (indício textual)']:[]),
  ...(findings.courtCosts?['Custas mencionadas: '+(findings.courtCosts.amount||'valor não identificado')]:[]),
  ...quality.flags.map(x=>'Pendência de verificação: '+x),
  'Conferência: qualquer prazo, audiência, sentença ou contato precisa de confirmação na fonte e revisão antes de agir.'
 ];
 if(task==='atendimento')lines.push('Nenhuma mensagem foi enviada e nenhum atendimento foi registrado.');
 return {task,title,note,stats,events,findings,quality,source_status:bySource,answer:lines.filter(Boolean).join('\n\n'),requiresReview:true,performedActions:[]};
}
