import {formatProcessNumber} from './processos-oficiais.mjs';
const ALIASES=Object.freeze({TJSP:'tjsp',TJRJ:'tjrj',TJMG:'tjmg',TJPR:'tjpr',TJBA:'tjba',TJRS:'tjrs',TJSC:'tjsc',TJPE:'tjpe',TRT2:'trt2',TRT3:'trt3',TRT4:'trt4',TRF1:'trf1',TRF2:'trf2',TRF3:'trf3',STJ:'stj',TST:'tst'});
export function buildDataJudDiscoveryQuery({term,court}={}){
 const alias=ALIASES[String(court||'').toUpperCase()];
 if(!alias)throw new Error('Tribunal obrigatório para busca DataJud; escolha uma opção conhecida.');
 const phrase=String(term||'').trim();
 if(phrase.length<4||phrase.length>110)throw new Error('Informe expressão de classe/assunto com 4 a 110 caracteres.');
 return {url:'https://api-publica.datajud.cnj.jus.br/api_publica_'+alias+'/_search',payload:{
  size:20,_source:['numeroProcesso','dataAjuizamento','tribunal','classe','assuntos','orgaoJulgador'],
  query:{bool:{should:[{match:{'classe.nome':phrase}},{match:{'assuntos.nome':phrase}}],minimum_should_match:1}}
 }};
}
function officialDate(v){
 const s=String(v||''),m=/^(20\d{2})-?([01]\d)-?([0-3]\d)/.exec(s);
 if(!m)return null;
 const iso=m[1]+'-'+m[2]+'-'+m[3],d=new Date(iso+'T12:00:00Z');
 return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===iso?iso:null;
}
export function normalizeDataJudCandidates(payload,term){
 if(!Array.isArray(payload?.hits?.hits))throw new Error('DataJud não devolveu formato oficial reconhecível.');
 const out=[],seen=new Set();
 for(const hit of payload.hits.hits.slice(0,20)){
  const doc=hit?._source;
  if(!doc||Number(doc.nivelSigilo||0)>0)continue;
  let cnj;try{cnj=formatProcessNumber(doc.numeroProcesso)}catch{continue}
  if(seen.has(cnj))continue;seen.add(cnj);
  const classname=String(doc.classe?.nome||'Classe processual não informada').slice(0,160);
  const subjects=(Array.isArray(doc.assuntos)?doc.assuntos:[]).slice(0,5).map(x=>String(x?.nome||'').slice(0,80)).filter(Boolean).join(' · ');
  out.push({source:'DataJud',process_number:cnj,query_term:'DataJud: '+String(term).slice(0,110),
   official_date:officialDate(doc.dataAjuizamento),tribunal:String(doc.tribunal||'').slice(0,40)||null,
   headline:classname,evidence:'Classe: '+classname+(subjects?' · Assuntos: '+subjects:'')+' · Metadados do CNJ; não é publicação do DJEN.',
   source_url:null,external_ref:null});
 }
 return out;
}
