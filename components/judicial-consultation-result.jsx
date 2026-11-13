'use client';
import {useState} from 'react';
const labels={checking:'Consultando...',ok:'Consultado agora',ok_browser:'Consultado no navegador',cached_previous:'Consulta anterior salva',not_checked:'Não consultado',unavailable:'Indisponível',timeout:'Tempo esgotado',blocked_403:'Acesso recusado pela fonte',rate_limited_429:'Limite de consultas atingido'};
const date=value=>{const day=String(value||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)?day.split('-').reverse().join('/'):'Data não informada'};
function officialLink(value){try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)jus\.br$/.test(u.hostname)?u.href:null}catch{return null}}
export function JudicialEvents({items=[],title='Movimentações e publicações'}){
 const [limit,setLimit]=useState(50);
 return <section className="lx-judicial-events"><h3>{title} ({items.length})</h3>
  {items.slice(0,limit).map((item,i)=><article className="lx-judicial-event" key={item.source+'|'+item.id+'|'+i}>
   <small>{date(item.date)} · {item.source}{item.savedAt?' · Salvo em '+date(item.savedAt):''}</small>
   <h4>{item.title||'Movimentação sem título'}</h4>{item.courtUnit&&<p>{item.courtUnit}</p>}
   {item.description&&<p className="lx-judicial-description">{item.description}</p>}
   {officialLink(item.link)&&<a href={officialLink(item.link)} target="_blank" rel="noopener noreferrer">Abrir publicação oficial</a>}
  </article>)}
  {items.length>limit&&<button type="button" className="inf-btn" onClick={()=>setLimit(n=>n+50)}>Mostrar mais movimentações</button>}
 </section>;
}
export default function JudicialConsultationResult({result}){
 const items=result.items||[],incomplete=result.partial||!result.ok;
 const bySource={djen:items.filter(x=>x.source==='DJEN').length,datajud:items.filter(x=>x.source==='DataJud').length};
 return <section className="lx-judicial-result" aria-label="Resultado da consulta judicial">
  <h3>{items.length?items.length+' registro(s) retornado(s)':incomplete?'Histórico judicial não confirmado':'Nenhum registro retornado neste período'}</h3>
  {!items.length&&<p>{incomplete?'A consulta não retornou movimentações e há fontes sem atualização confirmada. Isso não confirma ausência de histórico no tribunal.':'As fontes consultadas não retornaram registros para os parâmetros informados. Você pode pesquisar outras datas no formulário acima.'}</p>}
  <div className="lx-source-results">{['djen','datajud'].map(source=><section key={source}>
   <strong>{source==='djen'?'DJEN · publicações':'DataJud · movimentações'}</strong><p>{bySource[source]} {source==='djen'?'publicação(ões) DJEN':'movimentação(ões) DataJud'} neste resultado</p>
   <p>{labels[result.sourceStatus?.[source]]||'Situação não confirmada'}</p>
   {result.sourceErrors?.[source]&&<p role="status" className="lx-source-error">{result.sourceErrors[source]}</p>}
  </section>)}</div>
  {!bySource.djen&&result.sourceStatus?.djen==='ok'&&<p className="inf-note">O DJEN respondeu sem publicações para o CNJ e a pesquisa realizada. As movimentações do DataJud rotuladas como publicação não substituem o teor do diário.</p>}
  {result.persistenceErrors?.length>0&&<p role="status">{result.persistenceErrors.join(' ')}</p>}
  {result.windowsPending>0&&<p role="status">{result.windowsChecked} de {result.windowsTotal} períodos consultados; {result.windowsPending} pendente(s). Continue pelo formulário acima.</p>}
  {result.limited&&<p>Há mais resultados na fonte. Consulte a próxima página para continuar.</p>}
  {items.length>0&&<JudicialEvents key={result.checkedAt} items={items}/>}
 </section>;
}
