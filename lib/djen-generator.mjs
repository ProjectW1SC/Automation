import {formatProcessNumber,plainOfficialText} from './processos-oficiais.mjs';
export function buildDjenSearchURL(input){
 const term=String(input?.term||'').trim().slice(0,110);
 const start=String(input?.start||''),end=String(input?.end||'');
 if(term.length<4||!/^20\d{2}-\d{2}-\d{2}$/.test(start)||!/^20\d{2}-\d{2}-\d{2}$/.test(end)||start>end)
  throw new Error('Termo e intervalo de datas válidos são obrigatórios.');
 const days=(Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(days)||days>31)throw new Error('Consulte intervalos de até 31 dias por vez.');
 const court=String(input?.court||'').toUpperCase().trim();
 if(court&&!/^(TJ[A-Z]{2,4}|TRT(?:[1-9]|1\d|2[0-4])|TRF[1-6]|STJ|TST|STM|TSE)$/.test(court))
  throw new Error('Tribunal inválido.');
 const q=new URLSearchParams({texto:term,dataDisponibilizacaoInicio:start,dataDisponibilizacaoFim:end,pagina:'1',itensPorPagina:'50'});
 if(court)q.set('siglaTribunal',court);
 return 'https://comunicaapi.pje.jus.br/api/v1/comunicacao?'+q.toString();
}
export function parseDjenCandidates(data,term){
 const rows=Array.isArray(data)?data:Array.isArray(data?.items)?data.items:Array.isArray(data?.content)?data.content:null;
 if(!rows)throw new Error('DJEN não retornou uma lista verificável.');
 const seen=new Set(),out=[];
 for(const raw of rows){
  const digits=String(raw?.numeroProcesso||raw?.numero_processo||'').replace(/\D/g,'');
  if(digits.length!==20)continue;
  let number;try{number=formatProcessNumber(digits)}catch{continue}
  const id=String(raw?.hash||raw?.id||'').slice(0,130);
  const key=number+'|'+id;
  if(seen.has(key))continue;seen.add(key);
  const link=String(raw?.link||'');
  out.push({process_number:number,source:'DJEN',
   headline:String(raw?.tipoComunicacao||'Publicação oficial').slice(0,150),
   official_date:String(raw?.data_disponibilizacao||raw?.dataDisponibilizacao||'').slice(0,10)||null,
   tribunal:String(raw?.siglaTribunal||'').slice(0,16)||null,
   source_url:/^https:\/\/[^ ]+$/i.test(link)&&/\.jus\.br[/:]/.test(link)?link:null,
   evidence:plainOfficialText(raw?.texto||'').slice(0,1200),
   query_term:term.slice(0,110),external_ref:id||null
  });
 }
 return out.slice(0,50);
}
