import {formatProcessNumber,resolveCourtAlias} from './processos-oficiais.mjs';

const clean=(value,max=1800)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function officialLink(value){
 try{const url=new URL(String(value||''));return url.protocol==='https:'&&(/(^|\.)jus\.br$/.test(url.hostname)||url.hostname==='cnj.jus.br')?url.href:null}catch{return null}
}
function exactNumber(value,expected){
 return String(value||'').replace(/\D/g,'')===formatProcessNumber(expected).replace(/\D/g,'');
}

/** Validate and minimize an authenticated operator's result from the public browser APIs. */
export function validateBrowserOfficialResult(candidate,{source,number}={}){
 let cnj;try{cnj=formatProcessNumber(number)}catch{return null}
 const expectedSource=source==='datajud'?'DataJud':source==='djen'?'DJEN':null;
 if(!expectedSource||candidate?.ok!==true||candidate?.source!==expectedSource||
   candidate?.via!=='navegador'||!exactNumber(candidate?.number,cnj)||
   !Number.isFinite(Date.parse(candidate?.checkedAt||''))||
   typeof candidate?.found!=='boolean'||!Array.isArray(candidate?.items)||candidate.items.length>120)
  return null;
 if(expectedSource==='DataJud'&&String(candidate?.court||'').toUpperCase()!==resolveCourtAlias(cnj).toUpperCase())return null;
 const items=[];
 for(const item of candidate.items){
  if(!item||typeof item!=='object'||item.source!==expectedSource)return null;
  const title=clean(item.title,250),description=clean(item.description,1800);
  items.push({id:clean(item.id,160)||expectedSource+'-'+items.length,source:expectedSource,
   date:Number.isFinite(Date.parse(item.date||''))?new Date(item.date).toISOString():null,
   title:title||'Registro oficial',description,link:officialLink(item.link)});
 }
 return {ok:true,source:expectedSource,number:cnj,found:candidate.found,items,
  checkedAt:new Date(candidate.checkedAt).toISOString(),via:'navegador',
  court:expectedSource==='DataJud'?String(candidate.court).toUpperCase():undefined,
  meta:expectedSource==='DataJud'?{
   court:clean(candidate.meta?.court,50),courtUnit:clean(candidate.meta?.courtUnit,200),
   className:clean(candidate.meta?.className,140),degree:clean(candidate.meta?.degree,30),
   filedAt:Number.isFinite(Date.parse(candidate.meta?.filedAt||''))?new Date(candidate.meta.filedAt).toISOString():null
  }:undefined,
  notice:clean(candidate.notice,500)||'Consulta recebida pelo navegador do operador.'};
}

/** 403/429 are explicit source blocks; do not retry the same source from another network. */
export function browserResultNeedsServerFallback(candidate){
 if(candidate?.ok===true)return false;
 const status=Number(candidate?.status);
 return status!==403&&status!==429&&candidate?.reason!=='blocked_403'&&candidate?.reason!=='rate_limited';
}
