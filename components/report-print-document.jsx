'use client';
import {reportHealthNotes,percent} from '../lib/report-print.mjs';
import {limitSnippet} from '../lib/report-priority.mjs';
const number=v=>Number(v||0).toLocaleString('pt-BR');
const date=v=>v?new Date(v+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
const time=v=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const dur=seconds=>{const n=Number(seconds||0);return Math.floor(n/3600)+'h '+String(Math.floor((n%3600)/60)).padStart(2,'0')+'min'};
function PrintHead({chapter,title,number:page}){
 return <header className="pdf-sheet-heading"><div className="pdf-sheet-brand"><span className="pdf-mini-mark">W</span><div><b>PROJECTW1SC</b><small>NEGOCIAÇÕES · INTELIGÊNCIA OPERACIONAL</small></div></div><span className="pdf-chapter">{chapter}</span><h2>{title}</h2><span className="pdf-header-rule"/></header>;
}
function PrintFoot({page,generated}){
 return <footer className="pdf-sheet-foot"><span>PROJECTW1SC · Relatório interno · Dados restritos</span><span>Gerado em {time(generated)} · {String(page).padStart(2,'0')}/06</span></footer>;
}
function PrintMetric({label,value,sub}){
 return <article className="pdf-kpi"><small>{label}</small><strong>{number(value)}</strong><span>{sub}</span></article>;
}
function PrintBar({label,value,max,note,color}){
 return <div className="pdf-bar-row"><div><strong>{label}</strong><span>{note}</span></div><div className="pdf-track"><i style={{width:percent(value,max)+'%',background:color}}/></div><b>{number(value)}</b></div>;
}
function MiniTrend({days}){
 const records=days||[];
 const max=Math.max(1,...records.map(x=>Math.max(x.attendances,x.activities,x.finished)));
 const points=key=>records.map((x,i)=>{
  const px=20+i*640/Math.max(1,records.length-1);
  const py=156-126*Number(x[key]||0)/max;
  return px.toFixed(1)+','+py.toFixed(1);
 }).join(' ');
 return <div className="pdf-chart"><div className="pdf-chart-note">Evolução diária • registros identificados</div>
  <svg viewBox="0 0 680 178" role="img" aria-label="Curvas diárias de atendimentos, atividades e finalizações">
   {[0,.25,.5,.75,1].map(n=><line key={n} x1="20" x2="660" y1={30+n*126} y2={30+n*126} stroke="#e6dce1" strokeWidth="1" strokeDasharray="3 6"/>)}
   <polyline points={points('attendances')} fill="none" stroke="#802b4e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
   <polyline points={points('activities')} fill="none" stroke="#b889a0" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
   <polyline points={points('finished')} fill="none" stroke="#37775b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  </svg><div className="pdf-chart-legend"><span><i className="pdf-dot" style={{background:'#802b4e'}}/>Atendimentos</span><span><i className="pdf-dot" style={{background:'#b889a0'}}/>Atividades</span><span><i className="pdf-dot" style={{background:'#37775b'}}/>Finalizações</span></div>
 </div>;
}
function PriorityPdfRow({item,index}){
 return <article className="pdf-priority-row">
  <span className="pdf-priority-number">{index+1}</span>
  <div><div className="pdf-priority-name"><b>{item.name}</b><span className={'pdf-priority-level '+item.priority}>{item.priorityText}</span><span>{item.statusLabel}</span></div>
   <p>{item.institution||'Instituição não informada'} · Retorno: {date(item.due)} {item.overdueDays?'· '+item.overdueDays+' dias em atraso':''}</p>
   <p><strong>Nota:</strong> {item.note?limitSnippet(item.note,100):'Sem anotação cadastrada.'}</p>
   <p><strong>Atividade:</strong> {item.lastActivity?limitSnippet(item.lastActivity,100):'Sem atividade registrada.'}</p>
  </div>
 </article>;
}
function PriorityDetail({item,index}){
 return <article className="pdf-priority-detail">
  <div className="pdf-priority-detail-head"><b>{String(index+1).padStart(2,'0')} · {item.name}</b><span className={'pdf-priority-level '+item.priority}>{item.priorityText}</span></div>
  <small>{item.institution||'Sem instituição'} · {item.statusLabel} · Próximo retorno: {date(item.due)}</small>
  <p><b>Nota:</b> {item.note?limitSnippet(item.note,180):'Sem anotação registrada.'}</p>
  <p><b>Atividade:</b> {item.lastActivity?limitSnippet(item.lastActivity,180):'Sem atividade registrada.'}</p>
  {item.activityAt&&<small>Atividade: {time(item.activityAt)} · {item.activitySource||'Registro'}</small>}
 </article>;
}
export default function ReportPrintDocument({report,periodName,scopeName,generated,incomplete=false,members=[],priorityDigestRows=[]}){
 const p=report.portfolio,q=report.period;
 const notes=reportHealthNotes({incomplete,unverified:p.paidInSheet,conflicts:q.sourceConflicts});
 const total=Math.max(1,p.total);
 const maxCategory=Math.max(1,...(report.byCategory||[]).map(x=>x.count));
 return <div className="report-print-document" aria-label="Relatório operacional para PDF">
  <section className="pdf-page pdf-cover">
   <div className="pdf-cover-rail"><span className="pdf-cover-logo">W</span><small>PROJECTW1SC</small></div>
   <div className="pdf-cover-body">
    <div className="pdf-cover-top"><strong>PROJECTW1SC</strong><span>DOCUMENTO CONFIDENCIAL · {date(report.periodBounds.start)}</span></div>
    <div className="pdf-cover-main"><span className="pdf-eyebrow">RELATÓRIO EXECUTIVO · OPERAÇÃO E NEGOCIAÇÕES</span>
     <h1>Clareza para<br/><em>cada decisão.</em></h1>
     <p>Visão consolidada da carteira, dos retornos e do trabalho registrado no período. Uma apresentação objetiva, rastreável e apropriada à gestão.</p>
     <div className="pdf-cover-chips"><span>{periodName}</span><span>{scopeName}</span><span>Dados do Supabase</span></div>
    </div>
    <div className="pdf-cover-stats">
     <div><small>Clientes na carteira</small><strong>{number(p.total)}</strong></div>
     <div><small>Ativos</small><strong>{number(p.active)}</strong></div>
     <div><small>Finalizados</small><strong>{number(p.finalized)}</strong></div>
     <div><small>Vencidos ativos</small><strong>{number(p.overdue)}</strong></div>
    </div>
    <div className="pdf-cover-bottom"><div><b>Período dos eventos</b><span>{date(report.periodBounds.start)} — {date(new Date(Date.parse(report.periodBounds.endExclusive+'T12:00:00Z')-86400000).toISOString().slice(0,10))}</span></div><div><b>Emissão</b><span>{time(generated)}</span></div></div>
   </div>
  </section>
  <section className="pdf-page">
   <PrintHead chapter="01 / VISÃO GERAL" title="Resumo executivo" page={2}/>
   <div className="pdf-page-content">
    <p className="pdf-section-lead">Indicadores da carteira atual e dos registros de atendimento. Situação operacional não equivale a comprovação financeira.</p>
    <div className="pdf-kpi-grid">
     <PrintMetric label="Carteira total" value={p.total} sub="clientes cadastrados"/>
     <PrintMetric label="Acompanhamentos ativos" value={p.active} sub={percent(p.active,p.total)+'% da carteira'}/>
     <PrintMetric label="Finalizados" value={p.finalized} sub="situação no CRM"/>
     <PrintMetric label="Retornos vencidos" value={p.overdue} sub="somente clientes ativos"/>
     <PrintMetric label="Quitações verificadas" value={p.verified} sub="com documento comprovado"/>
     <PrintMetric label="Conflitos de origem" value={q.sourceConflicts} sub="revisão necessária"/>
    </div>
    <div className="pdf-section-label">COMPOSIÇÃO DA CARTEIRA</div>
    <div className="pdf-composition"><div className="pdf-composition-track"><span style={{width:percent(p.active,total)+'%'}}/><i style={{width:percent(p.finalized,total)+'%'}}/></div><div className="pdf-composition-labels"><span>Ativos · {number(p.active)}</span><span>Finalizados · {number(p.finalized)}</span></div></div>
    <div className="pdf-priority-note"><strong>Leitura operacional</strong><p>{number(p.overdue)} acompanhamentos ativos possuem retorno em atraso; {number(p.dueToday)} vencem hoje e {number(p.withoutDate)} estão sem próxima data cadastrada.</p></div>
    <div className="pdf-section-label">STATUS DE QUITAÇÃO E FONTE</div>
    <div className="pdf-fact-list"><div><span>Quitações informadas em planilhas</span><strong>{number(p.paidInSheet)}</strong></div><div><span>Quitações documentalmente verificadas</span><strong>{number(p.verified)}</strong></div><div><span>Conflitos de origem</span><strong>{number(q.sourceConflicts)}</strong></div></div>
   </div><PrintFoot page={2} generated={generated}/>
  </section>
  <section className="pdf-page">
   <PrintHead chapter="02 / MOVIMENTAÇÃO" title="Trabalho e produtividade" page={3}/>
   <div className="pdf-page-content">
    <p className="pdf-section-lead">Movimentações confirmadas em registros existentes, sem supor contatos ou resultados não documentados.</p>
    <div className="pdf-kpi-grid pdf-kpi-grid-four">
     <PrintMetric label="Atendimentos registrados" value={q.attendances} sub="no período selecionado"/>
     <PrintMetric label="Atividades concluídas" value={q.manualActivities} sub="lançamentos manuais"/>
     <PrintMetric label="Contatos confirmados" value={q.contactsConfirmed} sub="registrados nas atividades"/>
     <PrintMetric label="Clientes atendidos" value={q.clientsContacted} sub="distintos por histórico"/>
    </div>
    <div className="pdf-section-label">MOVIMENTAÇÃO AO LONGO DO PERÍODO</div>
    <MiniTrend days={report.daily}/>
    <div className="pdf-section-label">ATIVIDADES POR CATEGORIA</div>
    {(report.byCategory||[]).length?
     <div className="pdf-category-bars">{report.byCategory.slice(0,7).map(x=><PrintBar key={x.category} label={x.category.replaceAll('_',' ')} value={x.count} max={maxCategory} note="atividades" color="#802b4e"/>)}</div>:
     <div className="pdf-empty-state">Nenhuma atividade manual registrada neste período.</div>}
    <div className="pdf-time-note"><b>Horas registradas</b><strong>{dur(q.trackedSeconds)}</strong><span>Tempo informado por responsáveis nas atividades</span></div>
   </div><PrintFoot page={3} generated={generated}/>
  </section>
  <section className="pdf-page">
   <PrintHead chapter="03 / TRANSPARÊNCIA" title="Evolução e rastreabilidade" page={4}/>
   <div className="pdf-page-content">
    <p className="pdf-section-lead">Resumo diário de eventos registrados. Acompanhamentos sem evento no período não são contabilizados como atendimento.</p>
    <table className="pdf-daily-table"><thead><tr><th>Data</th><th>Atendimentos</th><th>Atividades</th><th>Finalizados</th></tr></thead><tbody>{report.daily.map(d=><tr key={d.day}><td>{date(d.day)}</td><td>{number(d.attendances)}</td><td>{number(d.activities)}</td><td>{number(d.finished)}</td></tr>)}</tbody></table>
    {members.length>0&&<div className="pdf-staff-note"><div className="pdf-section-label">DISTRIBUIÇÃO ATUAL DA CARTEIRA</div><div className="pdf-staff-list">{members.slice(0,4).map(m=><div key={m.name}><span>{m.name}</span><b>{number(m.clients)} clientes · {number(m.overdue)} vencidos</b></div>)}</div></div>}
    <div className="pdf-methodology"><div className="pdf-section-label">FONTE E LIMITAÇÕES</div>{notes.map((note,i)=><p key={i}>{note}</p>)}</div>
   </div><PrintFoot page={4} generated={generated}/>
  </section>
  <section className="pdf-page">
   <PrintHead chapter="04 / PRIORIDADES" title="10 prioridades operacionais" page={5}/>
   <div className="pdf-page-content">
    <p className="pdf-section-lead">Ordem idêntica à fila de Tarefas: vencimentos, urgência e criticidade. Somente acompanhamentos ativos. As notas e atividades abaixo correspondem aos últimos registros disponíveis, ainda que anteriores ao período do relatório.</p>
    <div className="pdf-priority-list">{priorityDigestRows.slice(0,10).map((item,i)=><PriorityPdfRow key={item.id} item={item} index={i}/>)}</div>
    {!priorityDigestRows.length&&<div className="pdf-empty-state">Não há acompanhamentos ativos para priorizar neste momento.</div>}
    <p className="pdf-priority-disclaimer">Criticidade é uma classificação operacional do CRM. O status de finalização não comprova quitação.</p>
   </div><PrintFoot page={5} generated={generated}/>
  </section>
  <section className="pdf-page">
   <PrintHead chapter="05 / REGISTROS" title="Anotações e atividades" page={6}/>
   <div className="pdf-page-content">
    <p className="pdf-section-lead">Últimas anotações e atividades dos dez acompanhamentos prioritários. Informações extraídas do histórico do Supabase, com data e responsável quando disponíveis. Não são contatos presumidos.</p>
    <div className="pdf-priority-details">{priorityDigestRows.slice(0,10).map((item,i)=><PriorityDetail key={item.id} item={item} index={i}/>)}</div>
    {!priorityDigestRows.length&&<div className="pdf-empty-state">Sem atividades ou anotações prioritárias para exibir.</div>}
    <p className="pdf-priority-disclaimer">Textos longos são resumidos nesta página para preservar a leitura e o tamanho A4. Consulte o histórico individual no CRM para o conteúdo integral.</p>
   </div><PrintFoot page={6} generated={generated}/>
  </section>
 </div>;
}
