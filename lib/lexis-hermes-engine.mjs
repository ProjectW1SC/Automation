// Adapted deterministic case findings from W1CAPITAL/LexisPredict
// src/lib/hermes-judicial-findings.ts and hermes-return-policy.ts.
// Based ONLY on stored public source excerpts; findings are indications, never final legal conclusions.
const flat=(x,n=700)=>String(x||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const norm=x=>flat(x,2000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const safeDay=x=>/^\d{4}-\d{2}-\d{2}/.test(String(x||''))?String(x).slice(0,10):null;
const finding=(v,e)=>({value:v,source:e.source,date:safeDay(e.date),excerpt:flat(e.text,340),basis:'indicio_textual',checkedAt:e.checked_at||null});
export function lexisLegalFindings(events=[]){
 const valid=(Array.isArray(events)?events:[]).filter(e=>e&&['DJEN','DataJud'].includes(e.source)&&flat(e.text).length>=8).slice(0,200);
 const result={verdict:null,enforcement:null,attorneyFees:null,legalAid:null,courtCosts:null,
  contradictions:[],sourceCounts:{DJEN:0,DataJud:0},latestBySource:{DJEN:null,DataJud:null},
  allCourtMovementsConfirmed:false,mode:'LexisPredict/Hermes · motor determinístico'};
 const verdicts=[];
 for(const e of valid.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))){
  result.sourceCounts[e.source]++;
  const day=safeDay(e.date);
  if(day&&(!result.latestBySource[e.source]||day>result.latestBySource[e.source]))result.latestBySource[e.source]=day;
  const t=norm(e.text),raw=flat(e.text,2000);
  const speculation=/recurso contra|apela[cç][aã]o contra|requer.{0,45}(?:que seja|a ser|seja) julgado|pedido de tutela|liminar|alega.{0,70}(?:proceden|improceden)|senten[cç]a de outro processo/i.test(raw);
  if(!speculation&&/\b(julgo|julgad[oa]s?|senten[cç]a.{0,35}(?:procedent|improcedent))/i.test(raw)){
   let v=null;
   if(/parcialmente procedentes?|procedentes? em parte|julgad[oa]s? em parte/.test(t))v='parcialmente_procedente';
   else if(/(?:julgo|julgad[oa]s?).{0,45}improcedentes?/.test(t))v='improcedente';
   else if(/(?:julgo|julgad[oa]s?).{0,45}procedentes?/.test(t))v='procedente';
   if(v){verdicts.push(finding(v,e));if(!result.verdict)result.verdict=finding(v,e);}
  }
  if(!result.enforcement&&/cumprimento de sentenca|execucao de sentenca/.test(t)){
   const started=/iniciad[oa]|instaurad[oa]|distribuid[oa]|determin.{0,30}(?:inicio|instaurac)/.test(t)&&!/pedido de instauracao|requer.{0,40}instaurac/.test(t);
   result.enforcement=finding(started?'cumprimento_iniciado':'cumprimento_mencionado',e);
  }
  if(!result.attorneyFees&&/honorarios.{0,40}sucumbenc|sucumbencia.{0,35}honorarios|fixo.{0,26}honorarios/.test(t)){
   const m=/honor[aá]rios.{0,140}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i.exec(raw)||/(\d{1,2}(?:[.,]\d{1,2})?)\s*%.{0,100}honor[aá]rios/i.exec(raw);
   const n=m?Number(m[1].replace(',','.')):null;
   result.attorneyFees={...finding('sucumbenciais_mencionados',e),percentage:n!==null&&n>=0&&n<=100?n:null};
  }
  if(!result.legalAid){
   if(/(?:indefiro|indeferid[ao]|nego|negad[ao]).{0,65}(?:justica gratuita|gratuidade da justica|assistencia judiciaria)/.test(t))result.legalAid=finding('indeferida',e);
   else if(/(?:defiro|deferid[ao]|concedo|concedid[ao]).{0,65}(?:justica gratuita|gratuidade da justica|assistencia judiciaria)/.test(t))result.legalAid=finding('deferida',e);
  }
  if(!result.courtCosts&&/custas processuais|recolhimento das custas|pagamento de custas|fixad[ao]s? as custas/.test(t)){
   const m=/custas.{0,110}?R\$\s*([\d.,]+)/i.exec(raw);
   result.courtCosts={...finding('custas_mencionadas',e),amount:m?'R$ '+m[1]:null,paymentStatus:'não determinado'};
  }
 }
 if(new Set(verdicts.map(v=>v.value)).size>1)result.contradictions.push('Resultados de mérito distintos nos registros encontrados. Verificar inteiro teor e data de cada decisão.');
 return result;
}
export function lexisAgentQuality({findings,sourceStatus=[],events=[]}={}){
 const sources=new Set(sourceStatus.map(x=>String(x||'').toUpperCase()));
 const gap=['DJEN','DATAJUD'].filter(x=>!sources.has(x));
 const flags=[];
 if(!events.length)flags.push('Nenhum trecho de movimentação pública armazenado para análise.');
 if(gap.length)flags.push('Fontes sem histórico confirmado no recorte: '+gap.join(', ')+'.');
 if(findings?.contradictions?.length)flags.push(...findings.contradictions);
 if(events.some(e=>!safeDay(e.date)))flags.push('Registros sem data processual exigem conferência.');
 const completeness=sources.size>=2?2:sources.size===1?1:0;
 return {grade:flags.length?'revisão necessária':'histórico limitado',sourceCompleteness:completeness,
  flags,improvementQueue:flags.map((reason,i)=>({id:'audit-'+i,action:'revisar origem e integridade dos dados',reason,
    autoApply:false})),selfModify:false,source:'LexisPredict · auditoria determinística'};
}
