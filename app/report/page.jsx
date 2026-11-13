'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,BarChart3,BriefcaseBusiness,CalendarDays,CheckCircle2,ChevronRight,Clock3,Download,FileCheck2,FileText,Filter,Loader2,LockKeyhole,Printer,Eye,RefreshCw,ShieldCheck,Users,Wallet} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import SecuredWorkspace from '../../components/secured-workspace';
import LexisSharedOffice from '../../components/lexis-shared-office';
import ProfessionalAuth from '../../components/professional-auth';
import {getClient} from '../../lib/supabase-client';
import {useCrmAccess} from '../../lib/use-crm-access';
import {ADMIN_EMAIL,signInWithPassword} from '../../lib/login.mjs';
import {todayBrazil} from '../../lib/tarefas.mjs';
import {buildReport,periodBounds,exportReportCsv} from '../../lib/report.mjs';
import {categoryLabel} from '../../lib/minhas-atividades.mjs';
import {sortTaskQueue} from '../../lib/tarefas.mjs';
import {priorityDigest,limitSnippet} from '../../lib/report-priority.mjs';
import ReportPrintDocument from '../../components/report-print-document';
import EfferdKpi from '../../components/efferd-kpi';

const periods=[{id:'esta_semana',label:'Esta semana'},{id:'semana_passada',label:'Semana passada'},{id:'mes',label:'Mês atual'}];
const periodLabel=Object.fromEntries(periods.map(p=>[p.id,p.label]));
const brDay=day=>day?day.slice(8,10)+'/'+day.slice(5,7):'—';
const fmt=v=>Number(v||0).toLocaleString('pt-BR');
const brTime=secs=>{
 const n=Math.max(0,Number(secs||0));return Math.floor(n/3600)+'h '+String(Math.floor(n%3600/60)).padStart(2,'0')+'min';
};
const Kpi=({icon,label,value,help,color=''})=><EfferdKpi icon={icon} title={label} value={fmt(value)} sub={help} tone={color||'default'}/>;
const Empty=({children})=><div className="report-empty"> <FileText size={20}/>{children}</div>;
function Trend({data}){
 const max=Math.max(1,...data.map(x=>Math.max(x.attendances,x.activities,x.finished)));
 const width=700,height=172,padX=15,padY=15;
 const points=key=>data.map((x,i)=>{
  const xp=padX+i*((width-2*padX)/Math.max(1,data.length-1));
  const yp=height-padY-(Number(x[key]||0)/max)*(height-2*padY);
  return xp.toFixed(2)+','+yp.toFixed(2);
 }).join(' ');
 if(!data.length)return <Empty>Sem eventos cadastrados neste período.</Empty>;
 return <div className="report-trend-wrap">
  <svg className="report-trend" viewBox="0 0 700 172" role="img" aria-label="Evolução diária de atendimentos, atividades e finalizações registradas">
   <defs><linearGradient id="report-line-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9f4365" stopOpacity=".17"/><stop offset="100%" stopColor="#9f4365" stopOpacity="0"/></linearGradient></defs>
   {[0,.25,.5,.75,1].map((n,i)=><line key={i} x1={padX} x2={width-padX} y1={padY+n*(height-2*padY)} y2={padY+n*(height-2*padY)} stroke="#ebdde2" strokeDasharray="3 6"/>)}
   {data.length>1&&<polygon fill="url(#report-line-gradient)" points={padX+','+(height-padY)+' '+points('attendances')+' '+(width-padX)+','+(height-padY)}/>}
   <polyline points={points('attendances')} stroke="#842d4d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
   <polyline points={points('activities')} stroke="#bf8ca2" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
   <polyline points={points('finished')} stroke="#557b61" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
  </svg>
  <div className="report-timeline-labels"><span>{brDay(data[0].day)}</span><span>{brDay(data[Math.floor((data.length-1)/2)].day)}</span><span>{brDay(data[data.length-1].day)}</span></div>
  <div className="report-legend"><span><i className="report-swatch attendance"/> Atendimentos</span><span><i className="report-swatch activities"/> Atividades</span><span><i className="report-swatch finished"/> Encerramentos</span></div>
 </div>;
}
function PortfolioDistribution({portfolio}){
 const total=Math.max(1,portfolio.total||0);
 const active=portfolio.active||0,finished=portfolio.finalized||0;
 const stop=(active/total*100).toFixed(2);
 return <div className="report-portfolio-distribution">
  <div className="report-donut" style={{background:`conic-gradient(#79314d 0% ${stop}%,#9599a4 ${stop}% 100%)`}} role="img" aria-label={`Carteira: ${active} ativos e ${finished} finalizados`}><div><strong>{fmt(portfolio.total)}</strong><small>clientes</small></div></div>
  <div className="report-portfolio-labels"><div><span><i className="report-swatch attendance"/>Ativos</span><b>{fmt(active)}</b></div><div><span><i className="report-swatch final"/>Finalizados</span><b>{fmt(finished)}</b></div><div><span><i className="report-swatch warn"/>Vencidos ativos</span><b>{fmt(portfolio.overdue)}</b></div></div>
 </div>;
}
function exportAggregate(report){
 const csv=exportReportCsv(report);
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='infinitum-relatorio-operacional.csv';a.click();URL.revokeObjectURL(url);
}
function ReportLogin({db,onLogged}){
 const [loginEmail,setLoginEmail]=useState(ADMIN_EMAIL);
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function login(e){
  e.preventDefault();setBusy(true);setError('');
  try{const {session}=await signInWithPassword(db.auth,password,loginEmail);setPassword('');onLogged(session)}
  catch(e){setError(e.message||'Não foi possível entrar.')}
  finally{setBusy(false)}
 }
 return <ProfessionalAuth eyebrow="INTELIGÊNCIA OPERACIONAL" title="Acesse relatórios" description="Indicadores, resultados e atividades organizados em um ambiente protegido.">
  <form className="w1-auth-form" onSubmit={login}>
   <label className="w1-auth-label" htmlFor="report-user">Conta autorizada</label><input id="report-user" required type="email" autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
   <label className="w1-auth-label" htmlFor="report-pass">Senha de acesso</label><input id="report-pass" type="password" required minLength={8} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Digite sua senha"/>
   <button disabled={busy} className="w1-auth-submit">{busy?'Verificando acesso...':'Entrar nos relatórios'}</button>
  </form>{error&&<p role="alert" className="w1-auth-feedback error">{error}</p>}
  <a href="/" className="w1-auth-back">Voltar ao CRM ou recuperar senha</a>
 </ProfessionalAuth>;
}
function LegacyReportPage(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true),[loading,setLoading]=useState(false);
 const access=useCrmAccess(db,session?.user);
 const [period,setPeriod]=useState('mes'),[scope,setScope]=useState('empresa'),[notice,setNotice]=useState(''),[pdfPreview,setPdfPreview]=useState(false);
 const [clients,setClients]=useState([]),[audit,setAudit]=useState([]),[manual,setManual]=useState([]),[priorityAudit,setPriorityAudit]=useState([]),[priorityManual,setPriorityManual]=useState([]),[updated,setUpdated]=useState(null);
 const today=todayBrazil();
 useEffect(()=>{
  if(!db){setAuthLoading(false);return}
  let alive=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{if(alive){setSession(s);setAuthLoading(false)}});
  db.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setAuthLoading(false)}}).catch(()=>setAuthLoading(false));
  return()=>{alive=false;subscription.unsubscribe()}
 },[db]);
 const load=useCallback(async()=>{
  if(!db||!access.allowed)return;
  setLoading(true);setNotice('');
  const bounds=periodBounds(period,today);
  // Previous UTC day avoids omitting events around the Sao Paulo midnight boundary.
  const prev=new Date(Date.parse(bounds.start+'T12:00:00Z')-86400000).toISOString().slice(0,10);
  const [c,a,m]=await Promise.all([
   db.from('crm_clients').select('id,name,assigned_to,consultant,workflow_status,next_return,due_override,finished_at,source_conflict,source_status,evidence_status,priority_level,notes,institution').order('created_at').limit(1000),
   db.from('crm_activities').select('id,client_id,actor_id,kind,created_at').gte('created_at',prev+'T00:00:00Z').order('created_at',{ascending:false}).limit(1000),
   db.from('crm_completed_activities').select('id,actor_id,client_id,category,performed_on,contact_confirmed,duration_seconds,origin').is('deleted_at',null).gte('performed_on',bounds.start).lt('performed_on',bounds.endExclusive).order('performed_on',{ascending:false}).limit(1000)
  ]);
  const errors=[c,a,m].map((x,i)=>x.error?[['Clientes','Atendimentos','Atividades'][i],x.error.message]:null).filter(Boolean);
  const rows=c.error?[]:c.data||[];
  setClients(rows);setAudit(a.error?[]:a.data||[]);setManual(m.error?[]:m.data||[]);
  const priorityIds=sortTaskQueue(rows.filter(x=>x.workflow_status!=='finalizado'),today).slice(0,10).map(x=>x.id);
  let noteResult=null,workResult=null;
  if(priorityIds.length){
   [noteResult,workResult]=await Promise.all([
    db.from('crm_activities').select('id,client_id,actor_id,kind,body,created_at').in('client_id',priorityIds).order('created_at',{ascending:false}).limit(1000),
    db.from('crm_completed_activities').select('id,client_id,actor_id,title,description,performed_on,created_at,deleted_at').in('client_id',priorityIds).is('deleted_at',null).order('created_at',{ascending:false}).limit(1000)
   ]);
  }
  setPriorityAudit(noteResult?.error?[]:noteResult?.data||[]);
  setPriorityManual(workResult?.error?[]:workResult?.data||[]);
  const moreErrors=[['Anotações e histórico',noteResult?.error],['Atividades recentes',workResult?.error]].filter(x=>x[1]);
  const truncated=[c,a,m,noteResult,workResult].some(x=>(x?.data?.length||0)>=1000);
  setNotice([...errors.map(x=>'Falha: '+x[0]),...moreErrors.map(x=>'Falha: '+x[0]),...(truncated?['Consulta limitada a mil registros em pelo menos uma fonte; verifique registros adicionais no CRM.']:[])].join(' · '));
  setUpdated(new Date());setLoading(false);
 },[db,period,session?.user?.id,today,access.allowed]);
 useEffect(()=>{if(access.allowed)load();else{setClients([]);setAudit([]);setManual([])}},[session?.user?.id,load]);
 const report=useMemo(()=>buildReport({clients,audit,manual,period,scope,actorId:session?.user?.id,today}),[clients,audit,manual,period,scope,session?.user?.id,today]);
 const priorityDigestRows=useMemo(()=>priorityDigest({clients,audit:priorityAudit,manual:priorityManual,today,scope,actorId:session?.user?.id}),[clients,priorityAudit,priorityManual,today,scope,session?.user?.id]);
 function printReport(){
  if(loading)return;
  const original=document.title;
  document.title='INFINITUM-Relatorio-Executivo-'+period+'-'+scope;
  const restore=()=>{document.title=original;window.removeEventListener('afterprint',restore)};
  window.addEventListener('afterprint',restore,{once:true});
  window.print();
 }
 const members=useMemo(()=>{
  const map=new Map();
  for(const c of clients){
   const name=String(c.assigned_to||c.consultant||'').trim();
   if(!name)continue;
   const v=map.get(name)||{name,clients:0,overdue:0};
   v.clients++;
   if(c.workflow_status!=='finalizado'&&(c.due_override||c.next_return)&&((c.due_override||c.next_return)<today))v.overdue++;
   map.set(name,v);
  }
  return [...map.values()].sort((a,b)=>b.clients-a.clients).slice(0,6);
 },[clients,today]);
 if(!db)return <main className="reference-auth"><p>CRM em configuração. A conexão com o Supabase não está disponível.</p></main>;
 if(authLoading)return <main className="reference-auth"><Loader2 size={23}/> Verificando acesso...</main>;
 if(!session)return <ReportLogin db={db} onLogged={setSession}/>;
 if(access.loading)return <main className="reference-auth">Validando permissão...</main>;
 if(!access.allowed)return <main className="reference-auth"><p>Conta sem autorização para este relatório.</p><button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 return <CrmShell active="Relatórios" email={session.user.email||''} overdueCount={report.portfolio.overdue} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard report-dashboard" data-projectw1sc-report="operational">
   <header className="reference-header report-header">
    <div><div className="reference-overline">INFINITUM · INTELIGÊNCIA OPERACIONAL</div><h1>Relatórios operacionais</h1><p>Carteira, atendimentos e atividades registradas. Dados do Supabase, sem estimativas.</p></div>
    <div className="reference-actions">
     <button className="reference-outline" onClick={load} disabled={loading}><RefreshCw size={16}/> Atualizar</button>
     <button className="reference-outline" onClick={()=>exportAggregate(report)} disabled={loading}><Download size={16}/> Exportar CSV</button>
     <button className="reference-outline" onClick={()=>setPdfPreview(x=>!x)}><Eye size={16}/> {pdfPreview?'Ocultar prévia':'Prévia PDF'}</button>
     <button className="reference-primary" onClick={printReport} disabled={loading}><Printer size={16}/> Exportar PDF</button>
    </div>
   </header>
   <section className="report-executive-hero" aria-label="Apresentação executiva do relatório">
    <div><span className="hero-overline">DOSSIÊ GERENCIAL · INFINITUM</span><h2>O panorama da operação,<br/>em uma única visão.</h2><p>Informações organizadas para decisões rápidas, com origem rastreável e separação entre quitação informada e comprovada.</p></div>
    <div className="hero-highlight"><small>Retornos ativos vencidos</small><strong>{fmt(report.portfolio.overdue)}</strong><small>{fmt(report.portfolio.active)} acompanhamentos ativos</small></div>
   </section>
   <div className="report-filters">
    <div><span>Período dos eventos</span><div className="report-segments">{periods.map(x=><button type="button" key={x.id} className={period===x.id?'active':''} aria-pressed={period===x.id} onClick={()=>setPeriod(x.id)}>{x.label}</button>)}</div></div>
    <div><span>Escopo das atividades</span><div className="report-segments"><button type="button" className={scope==='empresa'?'active':''} aria-pressed={scope==='empresa'} onClick={()=>setScope('empresa')}>Empresa</button><button type="button" className={scope==='meus'?'active':''} aria-pressed={scope==='meus'} onClick={()=>setScope('meus')}>Minhas</button></div></div>
    <div className="report-period-note"><CalendarDays size={16}/><div><b>{periodLabel[period]}</b><span>{brDay(report.periodBounds.start)} até {brDay(new Date(Date.parse(report.periodBounds.endExclusive+'T12:00:00Z')-86400000).toISOString().slice(0,10))}</span></div></div>
   </div>
   {notice&&<div className="reference-notice" role="status"><AlertTriangle size={17}/>{notice}</div>}
   <div className="reference-metrics reference-metrics-4 report-summary">
    <Kpi icon={Wallet} label="Carteira total" value={report.portfolio.total} help="Situação atual na carteira"/>
    <Kpi icon={Users} label="Ativos" value={report.portfolio.active} help="Acompanhamentos em andamento"/>
    <Kpi icon={CheckCircle2} label="Finalizados" value={report.portfolio.finalized} help="Não implica pagamento confirmado"/>
    <Kpi icon={AlertTriangle} label="Vencidos" value={report.portfolio.overdue} help="Retornos ativos em atraso"/>
    <Kpi icon={Activity} label="Atendimentos" value={report.period.attendances} help="Registros feitos no período"/>
    <Kpi icon={FileCheck2} label="Atividades concluídas" value={report.period.manualActivities} help="Registros manuais do período"/>
    <Kpi icon={ShieldCheck} label="Quitações verificadas" value={report.portfolio.verified} help="Comprovantes confirmados"/>
    <Kpi icon={BriefcaseBusiness} label="Clientes atendidos" value={report.period.clientsContacted} help="Clientes distintos no período"/>
   </div>
   <div className="report-grid">
    <section className="reference-panel report-trend-panel">
     <div className="report-section-head"><div><h2><BarChart3 size={19}/> Evolução da operação</h2><p>Atendimentos, atividades e finalizações registradas por dia</p></div><span className="report-subtitle">Fonte: registros no Supabase</span></div>
     <Trend data={report.daily}/>
    </section>
    <section className="reference-panel report-portfolio-panel">
     <div className="report-section-head"><div><h2><BriefcaseBusiness size={19}/> Situação da carteira</h2><p>Distribuição atual de acompanhamentos</p></div></div>
     <PortfolioDistribution portfolio={report.portfolio}/>
     <div className="report-mini-notes"><span><Clock3 size={15}/> Vencem hoje: <b>{fmt(report.portfolio.dueToday)}</b></span><span><CalendarDays size={15}/> Sem data: <b>{fmt(report.portfolio.withoutDate)}</b></span></div>
    </section>
   </div>
   <div className="report-grid report-grid-secondary">
    <section className="reference-panel">
     <div className="report-section-head"><div><h2><Activity size={19}/> Produtividade registrada</h2><p>Atividades manuais — diferentes da conciliação automática de planilhas</p></div></div>
     <div className="report-mini-stats"><div><span>Atividades concluídas</span><strong>{fmt(report.period.manualActivities)}</strong></div><div><span>Contatos confirmados</span><strong>{fmt(report.period.contactsConfirmed)}</strong></div><div><span>Horas informadas</span><strong>{brTime(report.period.trackedSeconds)}</strong></div></div>
     <h3>Atividades por categoria</h3>
     {report.byCategory.length?<div className="report-category-list">{report.byCategory.map(x=><div key={x.category}><div><span>{categoryLabel(x.category)}</span><b>{fmt(x.count)}</b></div><div className="report-bar"><span style={{width:(x.count/Math.max(1,report.period.manualActivities)*100)+'%'}}/></div></div>)}</div>:<Empty>Ainda não há atividades registradas neste período.</Empty>}
    </section>
    <section className="reference-panel">
     <div className="report-section-head"><div><h2><Users size={19}/> Carteira por responsável</h2><p>Distribuição do cadastro atual — não é ranking de atendimentos realizados</p></div></div>
     {members.length?<div className="report-category-list">{members.map((m,i)=><div key={m.name}><div><span>{m.name}</span><b>{fmt(m.clients)} clientes</b></div><div className="report-bar"><span style={{width:(m.clients/Math.max(1,members[0].clients)*100)+'%'}}/></div><small>{fmt(m.overdue)} vencidos atribuídos</small></div>)}</div>:<Empty>A carteira não possui responsáveis identificados.</Empty>}
     <div className="report-mini-notes"><span><AlertTriangle size={15}/> Conflitos entre origens: <b>{fmt(report.period.sourceConflicts)}</b></span><span><CheckCircle2 size={15}/> Encerrados no período: <b>{fmt(report.period.finalized)}</b></span></div>
    </section>
   </div>
   <section className="reference-panel report-priority-panel" aria-label="10 maiores prioridades">
    <div className="report-section-head"><div><h2><AlertTriangle size={19}/> As 10 maiores prioridades</h2><p>Mesma ordem da fila Tarefas. Somente clientes ativos; com última anotação e atividade registradas.</p></div><span className="report-subtitle">Último histórico disponível, independente do período</span></div>
    <div className="report-priority-list">{priorityDigestRows.map((item,i)=><article className="report-priority-item" key={item.id}>
     <span className="report-priority-rank">{i+1}</span>
     <div className="report-priority-main"><div className="report-priority-heading"><strong>{item.name}</strong><span className={'report-priority-level '+item.priority}>{item.priorityText}</span><span className={'report-priority-status '+item.status}>{item.statusLabel}</span></div>
     <div className="report-priority-meta">{item.institution||'Sem instituição'} · Retorno: {item.due?item.due.split('-').reverse().join('/'):'Sem data'}</div>
     <p><b>Anotação:</b> {item.note?limitSnippet(item.note,220):'Sem anotação registrada.'}</p>
     <p><b>Atividade:</b> {item.lastActivity?limitSnippet(item.lastActivity,220):'Sem atividade registrada.'}{item.activitySource?' · '+item.activitySource:''}</p>
     </div></article>)}
     {priorityDigestRows.length===0&&<div className="report-empty">Não existem clientes ativos para priorizar.</div>}
    </div>
   </section>
   <footer className="report-footer"><ShieldCheck size={15}/> Indicadores somente de eventos registrados. Quitação em planilha não equivale a comprovante. {updated&&<span>Consultado em {updated.toLocaleString('pt-BR')}</span>}</footer>
   <div className={'report-pdf-print-host '+(pdfPreview?'is-preview':'')}>
    {pdfPreview&&<div className="report-pdf-preview-bar"><strong>Prévia do relatório — seis páginas A4</strong><button className="reference-outline" onClick={()=>setPdfPreview(false)}>Fechar prévia</button><button className="reference-primary" onClick={printReport}><Printer size={15}/> Salvar PDF</button></div>}
    <ReportPrintDocument report={report} periodName={periodLabel[period]} scopeName={scope==='meus'?'Minhas atividades':'Empresa'}
      generated={updated||new Date()} incomplete={Boolean(notice)} members={members} priorityDigestRows={priorityDigestRows}/>
   </div>
  </main>
 </CrmShell>;
}

// /report conserva a identidade e a rota do Infinitum. O modo Lexis lê o banco principal.
export default function ReportPage(){
 if(process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1')
  return <SecuredWorkspace active="Relatórios">{({db,session})=><LexisSharedOffice area="reports" db={db} session={session}/>}</SecuredWorkspace>;
 return <LegacyReportPage/>;
}
