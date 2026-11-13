import {formatProcessNumber} from './processos-oficiais.mjs';
import {hearingCandidates,verdictCandidates} from './judicial-triage.mjs';
// Regras de auditoria do Hermes/LexisPredict reconstruídas para o BLACKHOLE:
// distinguir metadado DataJud e publicação DJEN, e exigir revisão humana.
const msg=x=>String(x||'').replace(/\s+/g,' ').trim().slice(0,340);
const state=x=>{
 if(x?.ok===true)return x?.stale||x?.fromCache?'cached_previous':'confirmed';
 const err=String(x?.error||'');
 if(Number(x?.status)===403||/403\b|blocked_403|bloquead.*403/i.test(err))return 'blocked_403';
 if(Number(x?.status)===429||/429\b|rate.limited/i.test(err))return 'rate_limited_429';
 if(/pausa|retry_after|retry-after/i.test(err))return 'cooldown';
 if(Number(x?.status)===504||/tempo limite|timeout|timed\s*out|esgotad|abort/i.test(err))return 'timeout';
 return 'unavailable';
};
export function sourceSummary({datajud,djen}){
 const serialize=(x,source)=>({source,status:state(x),found:x?.ok===true?!!x.found:null,
  checked_at:x?.ok===true?x.checkedAt||null:null,
  fromCache:!!x?.fromCache,count:x?.ok===true?(Array.isArray(x.items)?x.items.length:0):null,
  error:x?.ok===true?(x?.sourceError?msg(x.sourceError):null):msg(x?.error||'Fonte indisponível')});
 const dj=serialize(datajud,'DataJud'),dn=serialize(djen,'DJEN'),done=[dj,dn].filter(x=>x.status==='confirmed').length;
 const available=[dj,dn].filter(x=>['confirmed','cached_previous'].includes(x.status)).length;
 return {datajud:dj,djen:dn,complete:done===2,partial:done===1,confirmedSources:done,availableSources:available};
}
export function selectScannerCases(cases,limit=4){
 const cap=Math.max(1,Math.min(8,Math.floor(Number(limit)||4))),seen=new Set(),out=[];
 for(const item of Array.isArray(cases)?cases:[]){
  let cnj;try{cnj=formatProcessNumber(item?.process_number)}catch{continue}
  if(seen.has(cnj))continue;
  seen.add(cnj);out.push({...item,process_number:cnj});
  if(out.length>=cap)break;
 }
 return out;
}
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function directFinding(snaps,re,extract,limit=5){
 const found=[],seen=new Set();
 for(const snap of snaps){
  for(const ev of (snap.payload?.items||[])){
   const full=msg(ev?.title)+' '+msg(ev?.description);
   const value=normalize(full);
   if(!re.test(value))continue;
   const item=extract(value,full,ev,snap);
   if(!item)continue;
   const key=item.kind+'|'+item.date+'|'+snap.process_number;
   if(seen.has(key))continue;seen.add(key);
   found.push(item);
   if(found.length>=limit)return found;
  }
 }
 return found;
}
export function buildScannerReview(snapshots,{today=new Date().toISOString().slice(0,10)}={}){
 const rows=(Array.isArray(snapshots)?snapshots:[]).filter(x=>x?.process_number&&Array.isArray(x?.payload?.items)).slice(0,24);
 const hearings=hearingCandidates(rows,today).slice(0,15);
 const verdicts=verdictCandidates(rows).slice(0,15).map(x=>({...x,classification:
   /parcial/i.test(x.label)?'possível_parcial':/improced/i.test(x.label)?'possível_improcedencia':
   /proced/i.test(x.label)?'possível_procedencia':'revisar_decisao'}));
 const enforcement=directFinding(rows,/cumprimento de sentenca|execucao de sentenca|liquidacao de sentenca/,
  (_,full,ev,snap)=>({kind:'cumprimento_mencionado',date:ev.date||null,source:ev.source||snap.source,
    evidence:full.slice(0,310),process_number:snap.process_number,verified:false}));
 const fees=directFinding(rows,/honorarios.{0,45}sucumbenciais|sucumbencia.{0,45}honorarios/,
  (_,full,ev,snap)=>({kind:'honorarios_mencionados',date:ev.date||null,source:ev.source||snap.source,
    evidence:full.slice(0,310),process_number:snap.process_number,verified:false}));
 const legalAid=directFinding(rows,/justica gratuita|gratuidade da justica|assistencia judiciaria/,
  (text,full,ev,snap)=>{
   const action=/\b(?:defiro|deferid[ao]|concedo|concedid[ao]|indefiro|indeferid[ao]|nego|negad[ao])\b.{0,70}(?:justica gratuita|gratuidade da justica|assistencia judiciaria)/.test(text);
   return action?{kind:'decisao_justica_gratuita_a_conferir',date:ev.date||null,
    source:ev.source||snap.source,evidence:full.slice(0,310),process_number:snap.process_number,verified:false}:null;
  });
 const costs=directFinding(rows,/custas processuais|recolhimento das custas|custas devidas|pagamento de custas/,
  (_,full,ev,snap)=>({kind:'custas_mencionadas',date:ev.date||null,
   source:ev.source||snap.source,evidence:full.slice(0,310),process_number:snap.process_number,verified:false}));
 const confirmedOfficialEvents=rows.reduce((n,s)=>n+(s.payload.items?.length||0),0);
 const priority=hearings.length||verdicts.length||enforcement.length?7:confirmedOfficialEvents?15:30;
 const nextReturnDays=priority;
 return {hearings,verdicts,enforcement,fees,legalAid,costs,confirmedOfficialEvents,
  nextReturnDays,returnReason:hearings.length?'Há possível audiência futura; revisar imediatamente a agenda e os autos.':
   verdicts.length?'Há possível decisão de mérito; consultar inteiro teor antes de definir providências.':
   enforcement.length?'Há menção a cumprimento/execução; confirmar fase e atos concretos.':
   confirmedOfficialEvents?'Existem movimentos/publicações no registro; revisar atualizações.':
   'Nenhuma movimentação foi confirmada nesta amostra. Repetir a revisão das fontes quando disponíveis.',
  disclaimer:'Triagem de indícios dos registros disponibilizados. Não substitui revisão humana, não fixa prazo judicial e não comprova andamento quando a fonte falhou.',
  performedActions:[]};
}
