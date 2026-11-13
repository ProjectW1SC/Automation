// Roteamento deterministico, sem modelo externo, para consulta judicial explicita.
// Um numero informado nao autoriza acessar carteiras de outras empresas.
export function requestedOfficialQuery(prompt){
 const text=String(prompt||'').trim();
 const cnj=text.match(/(?:^|\D)(\d{7}[-.\s]?\d{2}[-.\s]?\d{4}[-.\s]?\d[-.\s]?\d{2}[-.\s]?\d{4})(?!\d)/);
 if(!cnj)return null;
 const number=cnj[1].replace(/\D/g,'');
 if(number.length!==20)return null;
 const lower=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!/(consult|pesquis|busc|verific|chec|confer|mostr|procur|analis|investig|atualiz|djen|datajud|publicac|moviment|andamento|diario)/.test(lower))return null;
 const djen=/djen|publicac|diario|intimac/.test(lower);
 const datajud=/datajud|moviment|andamento/.test(lower);
 return {number,source:djen&&!datajud?'djen':datajud&&!djen?'datajud':'auto'};
}
const statusMap={
 ok:'consultado agora',ok_browser:'consultado no navegador',
 cached_previous:'consulta anterior, sem atualizacao confirmada',
 blocked_403:'acesso recusado pela fonte (HTTP 403)',
 rate_limited_429:'limite de requisicoes (HTTP 429)',
 timeout:'tempo excedido',not_checked:'nao solicitado',
 unavailable:'indisponivel',checking:'ainda em consulta'
};
const str=(value,max=200)=>String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
const calendar=value=>{
 const day=str(value,30).slice(0,10);
 return /^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(8)+'/'+day.slice(5,7)+'/'+day.slice(0,4):'data nao informada';
};
export function reportOfficialQuery({number,source='auto',result={}}){
 const items=Array.isArray(result.items)?result.items.filter(row=>row?.source==='DJEN'||row?.source==='DataJud'):[];
 const djen=items.filter(item=>item.source==='DJEN'),datajud=items.filter(item=>item.source==='DataJud');
 const statuses=result.sourceStatus||{djen:source==='datajud'?'not_checked':result.ok?'ok':'unavailable',
  datajud:source==='djen'?'not_checked':result.ok?'ok':'unavailable'};
 const errors=result.sourceErrors||{};
 const statusText=kind=>{
  const value=statuses[kind]||'unavailable';
  return (statusMap[value]||value)+(errors[kind]?' — '+str(errors[kind],200):'');
 };
 const lines=[
  'Consulta judicial por CNJ: '+str(number,32),
  'DJEN — '+statusText('djen')+'; '+djen.length+' publicacao(oes) recebida(s).',
  'DataJud — '+statusText('datajud')+'; '+datajud.length+' movimentacao(oes) recebida(s).',
  result.ok===false?'Erro da consulta oficial: '+str(result.error||'Fonte indisponivel',230):null,
  result.fromCache||result.stale?'Atencao: a consulta contem dados anteriores salvos; nao equivale a atualizacao em tempo real.':null,
  result.partial?'Consulta parcial: uma fonte ou pagina nao foi confirmada.':null,
  djen.length===0&&source!=='datajud'?'Nenhuma publicacao DJEN foi recebida nessa pesquisa. Movimentos com titulo "Publicacao" no DataJud NAO sao documentos DJEN.':null,
  ...items.slice(0,12).map(item=>calendar(item.date)+' · '+item.source+' · '+str(item.title||item.description||'Registro',180)),
  result.limited?'Existem mais paginas na fonte consultada; confira as demais paginas em Processos.':null,
  'Consulta de dados publicos: nao substitui conferencia dos autos oficiais, nao calcula automaticamente prazos e nao protocola atos.'
 ].filter(Boolean);
 const used=[['djen','DJEN'],['datajud','DataJud']].filter(([key])=>statuses[key]&&statuses[key]!=='not_checked').map(([,label])=>label);
 return {reply:lines.join('\n\n'),review:{task:'consulta-judicial',title:'Consulta oficial por CNJ',source_status:used,
  query_source:source,process_number:number,sourceStatus:statuses,sourceErrors:errors,
  counts:{djen:djen.length,datajud:datajud.length},performedActions:['Leitura oficial autorizada sem alteracao no processo'],
  requiresReview:true},notice:result.partial?'Consulta judicial parcial. Veja a situacao individual de cada fonte.':'Consulta oficial concluida, sem alteracoes de processo ou cliente.'};
}
