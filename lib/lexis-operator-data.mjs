import {normalizedCnj} from './lexis-shared-portfolio.mjs';
const clean=x=>String(x??'').trim();
const fold=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const date=x=>{const d=clean(x).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)?d:null};
const safeUrl=x=>{try{const u=new URL(x);return ['http:','https:'].includes(u.protocol)?u.href:null}catch{return null}};
export const normalizeCaseNumber=x=>normalizedCnj(x);
export const isClosedLexisStatus=x=>['ENCERRADO','FINALIZADO'].includes(fold(x));
export const closedStatusFilters=['ENCERRADO','FINALIZADO'];
export function decorateLexisWork(rows=[],members=[]){
 const names=new Map((members||[]).map(x=>[clean(x.auth_user_id),clean(x.nome)]).filter(([id,name])=>id&&name));
 return (rows||[]).map(r=>({...r,responsible:names.get(clean(r.responsavel_auth_user_id))||'Não identificado',
  contactConfirmed:r.contato_cliente_confirmado===true}));
}
function classify(title,description,source){
 const s=fold(title+' '+description);
 if(/SENTENCA|ACORDAO|DECISAO|JULGAMENTO|HOMOLOGACAO/.test(s))return 'decisao';
 return source==='DJEN'?'publicacao':'movimentacao';
}
function fromEvent(e,source,cached,checkedAt){
 if(!e||typeof e!=='object')return null;
 const title=clean(e.title||e.titulo||e.name||e.descricao||e.description||e.texto).slice(0,300);
 const description=clean(e.description||e.descricao||e.content||e.texto).slice(0,2000);
 if(!title&&!description)return null;
 const actualSource=fold(e.source)==='DJEN'?'DJEN':fold(e.source)==='DATAJUD'?'DataJud':source;
 return {id:clean(e.id),source:actualSource,date:date(e.date||e.data||e.dataDisponibilizacao||e.dataMovimento||e.timestamp)||null,
  title:title||'Registro judicial',description,kind:classify(title,description,actualSource),
  url:safeUrl(e.link||e.url||e.source_url),checkedAt:clean(checkedAt||e.checkedAt)||null,cached:!!cached,
  evidence:true};
}
export function normalizeLexisJudicialTimeline({process={},snapshots=[],live=null}={}){
 const entries=[];
 // Cadastro processual traz os últimos resumos verificados, não o inteiro teor do tribunal.
 if(process?.djen_ultimo_resumo&&date(process.djen_ultima_data))
  entries.push({id:'process-djen',source:'DJEN',date:date(process.djen_ultima_data),
   title:clean(process.djen_ultimo_resumo).slice(0,300),description:'',
   kind:classify(process.djen_ultimo_resumo,'','DJEN'),url:safeUrl(process.djen_ultimo_link),
   checkedAt:clean(process.djen_consultado_em)||null,cached:true,evidence:true});
 if(process?.datajud_ultimo_nome&&date(process.datajud_ultimo_movimento))
  entries.push({id:'process-datajud',source:'DataJud',date:date(process.datajud_ultimo_movimento),
   title:clean(process.datajud_ultimo_nome).slice(0,300),description:'',
   kind:classify(process.datajud_ultimo_nome,'','DataJud'),url:null,
   checkedAt:clean(process.datajud_consultado_em)||null,cached:true,evidence:true});
 for(const row of (snapshots||[])){
  if(!row?.payload||row.payload.ok===false||!Array.isArray(row.payload.items))continue;
  const src=fold(row.source)==='DJEN'?'DJEN':'DataJud';
  for(const e of row.payload.items){const entry=fromEvent(e,src,true,row.checked_at);if(entry)entries.push(entry)}
 }
 if(live?.ok===true&&Array.isArray(live.items)){
  for(const e of live.items){const src=fold(e.source)==='DJEN'?'DJEN':'DataJud';
   const entry=fromEvent(e,src,live.fromCache||live.stale,live.checkedAt);
   if(entry)entries.push(entry)}
 }
 // Os mesmos eventos podem chegar via cadastro e snapshot. Preservar versão com mais evidência/link.
 const unique=new Map();
 for(const x of entries){
  const key=[x.source,x.date,fold(x.title)].join('|');
  const old=unique.get(key);
  if(!old||(Number(!!x.url)+x.description.length/1000)>(Number(!!old.url)+old.description.length/1000))unique.set(key,x);
 }
 return [...unique.values()].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||
   String(a.source).localeCompare(String(b.source)));
}
