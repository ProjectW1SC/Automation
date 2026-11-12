// Adapted from LexisPredict's DataJud/DJEN integrations.
// Official API: CNJ DataJud and CNJ Comunica PJe. Never fabricate missing events.
const COURTS={
 '8.01':'tjac','8.02':'tjal','8.03':'tjap','8.04':'tjam','8.05':'tjba','8.06':'tjce','8.07':'tjdft','8.08':'tjes','8.09':'tjgo','8.10':'tjma','8.11':'tjmt','8.12':'tjms','8.13':'tjmg','8.14':'tjpa','8.15':'tjpb','8.16':'tjpr','8.17':'tjpe','8.18':'tjpi','8.19':'tjrj','8.20':'tjrn','8.21':'tjrs','8.22':'tjro','8.23':'tjrr','8.24':'tjsc','8.25':'tjse','8.26':'tjsp','8.27':'tjto',
 '4.01':'trf1','4.02':'trf2','4.03':'trf3','4.04':'trf4','4.05':'trf5','4.06':'trf6',
 ...Object.fromEntries(Array.from({length:24},(_,i)=>['5.'+String(i+1).padStart(2,'0'),'trt'+(i+1)])),
 '2.00':'stj','2.01':'stj','3.00':'tst','3.01':'tst','6.00':'tse','7.00':'stm'
};
export function formatProcessNumber(raw){
 const digits=String(raw||'').replace(/\D/g,'');
 if(digits.length!==20)throw new Error('Informe um número CNJ com 20 dígitos.');
 return digits.slice(0,7)+'-'+digits.slice(7,9)+'.'+digits.slice(9,13)+'.'+digits.slice(13,14)+'.'+digits.slice(14,16)+'.'+digits.slice(16,20);
}
export function resolveCourtAlias(raw){
 const digits=formatProcessNumber(raw).replace(/\D/g,'');
 const court=COURTS[digits[13]+'.'+digits.slice(14,16)];
 if(!court)throw new Error('Tribunal não identificado no número CNJ. Confirme o número antes da consulta.');
 return court;
}
export function onlyExactProcess(obj,expected){
 const d=String(obj?.numeroProcesso||obj?.numero_processo||'').replace(/\D/g,'');
 return d.length===20&&d===formatProcessNumber(expected).replace(/\D/g,'');
}
export function plainOfficialText(raw){
 return String(raw||'')
  .replace(/<br\s*\/?>/gi,'\n').replace(/<\/(?:p|div|li|tr)>/gi,'\n')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"')
  .replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,x)=>{const n=Number(x);return n>=32&&n<127?String.fromCharCode(n):''})
  .replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,8000);
}
function dateOf(v){
 const raw=String(v||'');
 const d=Date.parse(raw);
 if(!raw||Number.isNaN(d))return null;
 return new Date(d).toISOString();
}
function safeLink(raw){
 try{const u=new URL(String(raw||''));return u.protocol==='https:'&&(/(^|\.)jus\.br$/.test(u.hostname)||u.hostname==='cnj.jus.br')?u.href:null}catch{return null}
}
export function normalizeDataJud(doc,number){
 const original=formatProcessNumber(number);
 if(!onlyExactProcess(doc,number))return {found:false,number:original,meta:null,movements:[]};
 const movements=(Array.isArray(doc.movimentos)?doc.movimentos:[]).slice(0,1500).map((m,i)=>{
  const date=dateOf(m.dataHora||m.data||m.dataMovimento);
  const title=String(m.nome||m.descricao||'Movimentação judicial').trim().slice(0,250);
  const details=(Array.isArray(m.complementosTabelados)?m.complementosTabelados:[])
   .map(x=>String(x.descricao||x.nome||x.valor||'').trim()).filter(Boolean).slice(0,6).join(' · ');
  return {id:'dj-'+String(m.codigo||i)+'-'+String(date||i),source:'DataJud',date,title,description:plainOfficialText(details),code:m.codigo||null,link:null};
 });
 movements.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return {found:true,number:original,meta:{
  court:String(doc.tribunal||'').slice(0,35),courtUnit:String(doc.orgaoJulgador?.nome||'').slice(0,200),
  className:String(doc.classe?.nome||'').slice(0,140),degree:String(doc.grau||'').slice(0,40),
  filedAt:dateOf(doc.dataAjuizamento)
 },movements};
}
export function normalizeDjen(data,number){
 const raw=Array.isArray(data)?data:Array.isArray(data?.items)?data.items:Array.isArray(data?.content)?data.content:null;
 if(!raw)throw new Error('O DJEN respondeu sem uma lista de publicações.');
 const seen=new Set();
 return raw.filter(x=>x&&typeof x==='object'&&onlyExactProcess(x,number)).map((x,i)=>{
  const date=dateOf(x.data_disponibilizacao||x.dataDisponibilizacao||x.data_publicacao||x.dataPublicacao);
  const description=plainOfficialText(x.texto||x.teor||x.conteudo||'');
  return {id:'djen-'+String(x.hash||x.id||i),source:'DJEN',date,
   title:String(x.tipoComunicacao||x.tipo_comunicacao||'Publicação no DJEN').slice(0,180),
   description,code:null,courtUnit:String(x.nomeOrgao||x.nome_orgao||'').slice(0,140),
   link:safeLink(x.link||x.url)};
 }).filter(x=>{const k=x.id+'-'+x.date;if(seen.has(k))return false;seen.add(k);return true})
 .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
export function mergeEvents(...sources){
 const all=sources.flat().filter(Boolean).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const seen=new Set();
 return all.filter(x=>{const key=x.source+'|'+x.id+'|'+x.date;if(seen.has(key))return false;seen.add(key);return true});
}
export function buildDjenUrl(number,{start,end}={}){
 const digits=formatProcessNumber(number).replace(/\D/g,'');
 const today=new Date().toISOString().slice(0,10);
 const first=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
 const begin=/^\d{4}-\d\d-\d\d$/.test(start||'')?start:first;
 const until=/^\d{4}-\d\d-\d\d$/.test(end||'')?end:today;
 if(begin>until)throw new Error('Data inicial deve ser anterior à data final.');
 const days=(Date.parse(until+'T12:00:00Z')-Date.parse(begin+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(days)||days>31)throw new Error('O período DJEN deve ter no máximo 31 dias por consulta. Use intervalos mensais para pesquisar anos anteriores.');
 const params=new URLSearchParams({numeroProcesso:digits,dataDisponibilizacaoInicio:begin,dataDisponibilizacaoFim:until,pagina:'1',itensPorPagina:'100'});
 return 'https://comunicaapi.pje.jus.br/api/v1/comunicacao?'+params.toString();
}
