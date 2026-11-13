import {officialDateIso,officialProcessDigits} from '../_shared/official-normalize.mjs';
const COURTS={
 '8.01':'tjac','8.02':'tjal','8.03':'tjap','8.04':'tjam','8.05':'tjba','8.06':'tjce','8.07':'tjdft',
 '8.08':'tjes','8.09':'tjgo','8.10':'tjma','8.11':'tjmt','8.12':'tjms','8.13':'tjmg','8.14':'tjpa',
 '8.15':'tjpb','8.16':'tjpr','8.17':'tjpe','8.18':'tjpi','8.19':'tjrj','8.20':'tjrn','8.21':'tjrs',
 '8.22':'tjro','8.23':'tjrr','8.24':'tjsc','8.25':'tjse','8.26':'tjsp','8.27':'tjto',
 '4.01':'trf1','4.02':'trf2','4.03':'trf3','4.04':'trf4','4.05':'trf5','4.06':'trf6',
 ...Object.fromEntries(Array.from({length:24},(_,i)=>['5.'+String(i+1).padStart(2,'0'),'trt'+(i+1)])),
 '3.00':'stj','5.00':'tst','6.00':'tse','7.00':'stm'
};
const clean=(v,n=1800)=>String(v??'').replace(/<[^>]+>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const digits=v=>String(v||'').replace(/\D/g,'');
export function formatCnj(raw){
 const d=digits(raw);if(d.length!==20)throw new Error('CNJ inválido: são necessários 20 dígitos.');
 return d.slice(0,7)+'-'+d.slice(7,9)+'.'+d.slice(9,13)+'.'+d.slice(13,14)+'.'+d.slice(14,16)+'.'+d.slice(16);
}
export function resolveCourtAlias(raw){
 const d=digits(formatCnj(raw)),key=d[13]+'.'+d.slice(14,16);
 if(!COURTS[key])throw new Error('Tribunal não identificado no número CNJ.');
 return COURTS[key];
}
const dateOf=officialDateIso;
function plainText(raw){
 return String(raw||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div|li|tr)>/gi,'\n')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'").replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,1800);
}
function officialLink(raw){
 try{const u=new URL(String(raw||''));return u.protocol==='https:'&&(/(^|\.)jus\.br$/.test(u.hostname)||u.hostname==='cnj.jus.br')?u.href:null}catch{return null}
}
export function normalizeDataJudSnapshot(payload,number,checkedAt=new Date().toISOString()){
 const cnj=formatCnj(number),expected=digits(cnj),hits=payload?.hits?.hits;
 if(!Array.isArray(hits))throw new Error('DataJud retornou formato de resposta não reconhecido.');
 const doc=hits.map(x=>x?._source).find(x=>x&&digits(x.numeroProcesso)===expected);
 if(!doc)return {ok:true,source:'DataJud',found:false,items:[],meta:null,checkedAt,
  notice:'Consulta DataJud concluída; CNJ não localizado nesta consulta. Isso não prova inexistência do processo.'};
 if(Number(doc.nivelSigilo||0)>0)return {ok:true,source:'DataJud',found:false,items:[],meta:null,checkedAt,
  notice:'Registro com nível de sigilo não foi exposto pelo scanner.'};
 const items=(Array.isArray(doc.movimentos)?doc.movimentos:[]).map((m,i)=>{
  const at=dateOf(m?.dataHora||m?.data||m?.dataMovimento);
  const details=(Array.isArray(m?.complementosTabelados)?m.complementosTabelados:[])
   .slice(0,8).map(x=>[x?.nome,x?.descricao,x?.valor].filter(v=>typeof v==='string'||typeof v==='number').join(': ')).filter(Boolean).join(' · ');
  return {id:'dj-'+String(m?.codigo||m?.movimentoNacional?.codigo||i)+'-'+String(at||i),source:'DataJud',date:at,
   title:clean(m?.nome||m?.movimentoNacional?.nome||m?.descricao||'Movimentação judicial',250),
   description:plainText([m?.descricao,details].filter(Boolean).join(' · ')),link:null,code:m?.codigo||m?.movimentoNacional?.codigo||null};
 }).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 return {ok:true,source:'DataJud',found:true,items:items.slice(0,1500),checkedAt,
  meta:{court:clean(doc.tribunal,50),courtUnit:clean(doc.orgaoJulgador?.nome,200),
   className:clean(doc.classe?.nome,140),degree:clean(doc.grau,30),filedAt:dateOf(doc.dataAjuizamento)},
  notice:'Metadados e movimentos do índice público DataJud. Não equivalem ao inteiro teor dos autos.'};
}
export function normalizeDjenSnapshot(payload,number,checkedAt=new Date().toISOString()){
 const cnj=formatCnj(number),expected=digits(cnj);
 const rows=Array.isArray(payload)?payload:Array.isArray(payload?.items)?payload.items:Array.isArray(payload?.content)?payload.content:null;
 if(!rows)throw new Error('DJEN retornou formato de lista não reconhecido.');
 const seen=new Set(),items=[];
 for(const [i,row] of rows.entries()){
  if(!row||officialProcessDigits(row)!==expected)continue;
  const hash=String(row.hash||row.id||i),date=dateOf(row.data_disponibilizacao||row.dataDisponibilizacao||row.data_publicacao||row.dataPublicacao);
  const rawLink=row.link||row.url||(row.hash?'https://comunica.pje.jus.br/consulta?hash='+encodeURIComponent(String(row.hash)):null);
  const link=officialLink(rawLink);
  const item={id:'djen-'+hash+'-'+String(date||i),source:'DJEN',date,
   title:clean(row.tipoComunicacao||row.tipo_comunicacao||row.tipo||'Publicação no DJEN',220),
   description:plainText(row.texto||row.teor||row.conteudo||''),link,
   courtUnit:clean(row.nomeOrgao||row.nome_orgao||row.nomeOrgaoJulgador||'',150)};
  const key=item.id+'|'+String(item.date||'');if(!seen.has(key)){seen.add(key);items.push(item)}
 }
 if(rows.length&&!items.length)throw new Error('DJEN retornou publicações sem correspondência verificável com este CNJ.');
 items.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 return {ok:true,source:'DJEN',found:items.length>0,items:items.slice(0,120),checkedAt,
  notice:items.length?'Publicações localizadas na API pública do DJEN.':'Consulta DJEN concluída sem publicações nesta janela; outras datas/fontes podem conter registros.'};
}
function explicitHearingDate(text){
 const match=/audi[êe]ncia.{0,180}?\b([0-3]?\d)\/([01]?\d)\/(20\d\d)\b(?:.{0,40}?(?:[àa]s?|hor[aá]rio)\s+([0-2]?\d)(?:[:h](\d\d))?)?/i.exec(text)||
  /audi[êe]ncia.{0,180}?\b(20\d\d)-([01]\d)-([0-3]\d)\b(?:.{0,40}?(?:[àa]s?|hor[aá]rio)\s+([0-2]?\d)(?:[:h](\d\d))?)?/i.exec(text);
 if(!match)return null;
 const iso=match[1].length===4?match[1]+'-'+match[2]+'-'+match[3]:match[3]+'-'+match[2].padStart(2,'0')+'-'+match[1].padStart(2,'0');
 const [y,m,d]=iso.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
 const hour=match[4]===undefined?null:Number(match[4]),minute=match[5]===undefined?0:Number(match[5]);
 return {date:iso,time:hour===null||hour>23||minute>59?null:String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')};
}
export function buildScheduledReview(snapshots,today){
 const rows=Array.isArray(snapshots)?snapshots:[],events=rows.flatMap(s=>(s.payload?.items||[]).map(e=>({...e,source:e.source||s.source,process_number:s.process_number,checked_at:s.checked_at})));
 const hearings=[],verdicts=[],enforcement=[],fees=[],legalAid=[],costs=[],seen=new Set();
 for(const e of events){
  const text=clean(e.title)+' '+clean(e.description),norm=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/audi[êe]ncia/i.test(text)){
   const when=explicitHearingDate(text),key=e.process_number+'|'+when?.date+'|'+(when?.time||'?');
   if(when&&when.date>=today&&!seen.has('h|'+key)){
    seen.add('h|'+key);hearings.push({process_number:e.process_number,date:when.date,time:when.time,
     source:e.source,type:/instru[çc][ãa]o/i.test(text)?'Instrução':/concilia[çc][ãa]o/i.test(text)?'Conciliação':/julgamento/i.test(text)?'Julgamento':'Audiência',
     evidence:text.slice(0,360),link:e.link||null});
   }
  }
  if(/\b(senten[çc]a|julgo|julgad[oa]s?|proced[eê]n|improced[eê]n)\b/i.test(text)){
   const key='v|'+e.process_number+'|'+e.id+'|'+e.date;
   if(!seen.has(key)){seen.add(key);const classification=/parcialmente procedentes?|procedentes? em parte/i.test(text)?'possível_parcial':
    /improcedentes?/i.test(text)?'possível_improcedencia':/procedentes?/i.test(text)?'possível_procedencia':'revisar_decisao';
    verdicts.push({process_number:e.process_number,date:e.date||null,source:e.source,classification,evidence:text.slice(0,360),link:e.link||null});}
  }
  const add=(list,kind)=>{const key=kind+'|'+e.process_number+'|'+e.id+'|'+e.date;if(seen.has(key))return;seen.add(key);list.push({kind,date:e.date||null,source:e.source,process_number:e.process_number,evidence:text.slice(0,360),verified:false})};
  if(/cumprimento de sentenca|execucao de sentenca|liquidacao de sentenca/.test(norm))add(enforcement,'cumprimento_mencionado');
  if(/honorarios.{0,45}sucumbenciais|sucumbencia.{0,45}honorarios/.test(norm))add(fees,'honorarios_mencionados');
  if(/justica gratuita|gratuidade da justica|assistencia judiciaria/.test(norm)&&/\b(?:defiro|deferid[ao]|concedo|concedid[ao]|indefiro|indeferid[ao]|nego|negad[ao])\b/.test(norm))add(legalAid,'decisao_jg_a_conferir');
  if(/custas processuais|recolhimento das custas|custas devidas|pagamento de custas/.test(norm))add(costs,'custas_mencionadas');
 }
 hearings.sort((a,b)=>(a.date+' '+(a.time||'')).localeCompare(b.date+' '+(b.time||'')));
 const confirmedOfficialEvents=events.length;
 const nextReturnDays=hearings.length||verdicts.length||enforcement.length?7:confirmedOfficialEvents?15:30;
 const returnReason=hearings.length?'Há possível audiência futura com data expressa; revisar imediatamente no tribunal.':
  verdicts.length?'Há possível decisão de mérito; conferir o inteiro teor antes de definir providências.':
  enforcement.length?'Há menção a cumprimento/execução; confirmar a fase e os atos concretos.':
  confirmedOfficialEvents?'Há registros oficiais recebidos; revisar as movimentações/publicações.':
  'As consultas foram concluídas sem eventos nesta janela. Isso não prova ausência de movimentação no tribunal.';
 return {hearings:hearings.slice(0,15),verdicts:verdicts.slice(0,15),enforcement:enforcement.slice(0,10),
  fees:fees.slice(0,10),legalAid:legalAid.slice(0,10),costs:costs.slice(0,10),confirmedOfficialEvents,
  nextReturnDays,returnReason,requiresHumanReview:true,performedActions:[],
  disclaimer:'Triagem de registros oficiais públicos. Não substitui leitura do inteiro teor, não fixa prazo judicial, não altera cadastro nem envia mensagens.'};
}
function closedStatus(raw){
 const s=String(raw||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /\b(encerrad[oa]s?|arquivad[oa]s?|baixad[oa]s?|concluid[oa]s?|extint[oa]s?)\b/.test(s);
}
export function selectScheduledCases({officeCases=[],crmProcesses=[],recentRuns=[],today,now=new Date().toISOString(),limit=2}={}){
 const time=Date.parse(now),cutoff=time-18*60*60*1000,recent=new Set();
 for(const r of recentRuns||[]){
  const at=Date.parse(r.checked_at||'');if(!Number.isFinite(at)||at<cutoff||at>time)continue;
  try{recent.add(String(r.actor_id)+'|'+digits(formatCnj(r.process_number)))}catch{}
 }
 const byKey=new Map();
 for(const row of officeCases||[]){
  const owner=row.owner_id;if(!owner||closedStatus(row.status))continue;
  let number;try{number=formatCnj(row.process_number)}catch{continue}
  const key=owner+'|'+digits(number);if(recent.has(key))continue;
  byKey.set(key,{actor_id:owner,process_number:number,title:clean(row.title||'Processo',180),
   status:row.status||'ativo',next_review:row.next_review||null,updated_at:row.updated_at||null,origin:'office_cases'});
 }
 for(const row of crmProcesses||[]){
  const owner=row.actor_id;if(!owner)continue;
  let number;try{number=formatCnj(row.process_number)}catch{continue}
  const key=owner+'|'+digits(number);if(recent.has(key)||byKey.has(key))continue;
  byKey.set(key,{actor_id:owner,process_number:number,title:'Processo da carteira',status:'ativo',
   next_review:null,updated_at:row.updated_at||null,origin:'crm_processes'});
 }
 return [...byKey.values()].sort((a,b)=>{
  const ad=a.next_review&&a.next_review<=today?0:1,bd=b.next_review&&b.next_review<=today?0:1;
  if(ad!==bd)return ad-bd;
  const an=a.next_review||'9999-12-31',bn=b.next_review||'9999-12-31';
  if(an!==bn)return an.localeCompare(bn);
  return String(a.updated_at||'').localeCompare(String(b.updated_at||''));
 }).slice(0,Math.max(1,Math.min(2,Number(limit)||1)));
}
