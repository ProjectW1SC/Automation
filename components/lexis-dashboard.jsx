'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,AlertTriangle,ArrowRight,BarChart3,CalendarDays,CheckCircle2,Clock3,FileWarning,Gavel,RefreshCw,Scale,Users} from 'lucide-react';
import {loadLexisCompanySources} from '../lib/lexis-company-data.mjs';
import {summarizeLexisDashboard} from '../lib/lexis-dashboard-metrics.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
import {resolveCompanyAccess} from '../lib/lexis-shared-portfolio.mjs';
const n=v=>Number(v||0).toLocaleString('pt-BR');
const date=v=>v?String(v).slice(0,10).split('-').reverse().join('/'):'—';
const labels={prazo:'Prazo',retorno:'Retorno',tarefa:'Tarefa',audiencia:'Audiência'};
function Stat({name,value,description,to,Icon,warning}){
 return <Link href={to} className={'lxd-stat '+(warning?'lxd-stat-danger':'')}><span className="lxd-stat-icon"><Icon size={19}/></span><span className="lxd-stat-name">{name}</span><strong>{value===null?'—':n(value)}</strong><small>{description}</small></Link>
}
function Head({eyebrow,title,to,children}){
 return <div className="lxd-heading"><div><span>{eyebrow}</span><h2>{title}</h2>{children&&<p>{children}</p>}</div>{to&&<Link href={to}>Ver detalhes <ArrowRight size={14}/></Link>}</div>
}
export default function LexisDashboard({db,session}){
 const [version,setVersion]=useState(0);
 const [state,setState]=useState({loading:true,error:'',company:'',warnings:[],valid:{},stats:null});
 const refresh=useCallback(()=>setVersion(v=>v+1),[]);
 useEffect(()=>{
  let mounted=true;
  (async()=>{
   setState(old=>({...old,loading:true,error:''}));
   try{
    const {data,error}=await db.from('usuarios').select('id,auth_user_id,empresa_id,nome').eq('auth_user_id',session.user.id).limit(2);
    if(error)throw error;
    const profile=resolveCompanyAccess(data||[],session.user.id);
    if(!profile)throw new Error('Sem vínculo único com uma empresa autorizada no LexisPredict.');
    const [company,loaded]=await Promise.all([
     db.from('empresas').select('nome').eq('id',profile.empresa_id).maybeSingle(),
     loadLexisCompanySources(db,profile.empresa_id)
    ]);
    if(!loaded.valid.processes)throw new Error('Fonte principal processos indisponível: '+loaded.errors.join(' · '));
    const stats=summarizeLexisDashboard({...loaded.sources,today:todayBrazil()});
    if(mounted)setState({loading:false,error:'',stats,company:company.data?.nome||'Organização',warnings:loaded.errors,valid:loaded.valid});
   }catch(err){if(mounted)setState(old=>({...old,loading:false,error:String(err.message||err),stats:null}))}
  })();
  return()=>{mounted=false};
 },[db,session.user.id,version]);
 const s=state.stats,valid=state.valid;
 const maxTribunal=Math.max(1,...(s?.tribunals||[]).map(x=>x.count));
 const maxMonth=Math.max(1,...(s?.months||[]).map(x=>x.count));
 return <main className="lxd-shell" data-lexis-dashboard="executive">
  <header className="lxd-top"><div><small>INFINITUM · LEXISPREDICT / PAINEL EXECUTIVO</small><h1>Visão jurídica completa</h1><p>{state.company||'Carteira da empresa'} · Processos, prazos, audiências e agenda em um só lugar.</p></div><div className="lxd-actions"><button className="inf-btn" disabled={state.loading} onClick={refresh}><RefreshCw size={15}/>{state.loading?' Consultando...':' Atualizar'}</button><Link className="inf-btn primary" href="/processos"><Scale size={15}/> Abrir carteira</Link></div></header>
  {state.loading&&<p className="lxd-message" role="status">Conferindo todos os registros da empresa, incluindo páginas adicionais...</p>}
  {state.error&&<div className="lxd-message danger" role="alert"><AlertTriangle size={18}/><span>Falha na consulta do Lexis: {state.error}. Não exibimos totais presumidos.</span><button className="inf-btn" onClick={refresh}>Repetir consulta</button></div>}
  {state.warnings.length>0&&<p className="lxd-message" role="alert">Algumas fontes não responderam: {state.warnings.join(' · ')}. Indicadores dessas fontes aparecem indisponíveis.</p>}
  {s&&<><section className="lxd-stats" aria-label="Indicadores da carteira">
   <Stat name="Processos com CNJ" value={s.processes} description="Somente processos com número CNJ" to="/processos" Icon={Scale}/>
   <Stat name="Processos ativos com CNJ" value={s.active} description="Desconsidera encerrados" to="/processos" Icon={Activity}/>
   <Stat name="Retornos vencidos" value={s.overdueReturns} description="Próximo retorno passado, sem atendimento posterior" to="/prazos" Icon={Clock3} warning/>
   <Stat name="Retornos para hoje" value={s.returnsToday} description="Contatos previstos para a data de hoje" to="/prazos" Icon={Users}/>
   <Stat name="Audiências futuras" value={valid.hearings?s.hearingsFuture:null} description="Com data, não canceladas" to="/audiencias" Icon={Gavel}/>
   <Stat name="Audiências sem data" value={valid.hearings?s.hearingsUndated:null} description="Aguardando confirmação de data" to="/audiencias" Icon={CalendarDays}/>
  </section>
  <section className="lxd-panels">
   <article className="lxd-panel"><Head eyebrow="ACOMPANHAMENTO AO CLIENTE" title="Retornos e atendimentos" to="/prazos">Mesma regra da aba Prazos: próximo retorno comparado com o último atendimento do cliente.</Head>
    <div className="lxd-overdue"><span>Retornos vencidos (com CNJ)</span><strong>{n(s.overdueReturns)}</strong></div>
    <div className="lxd-lines">
     <Link href="/prazos">Para hoje <b>{n(s.returnsToday)}</b><ArrowRight size={14}/></Link>
     <Link href="/prazos">Nos próximos 7 dias <b>{n(s.returnsNext7)}</b><ArrowRight size={14}/></Link>
     <Link href="/prazos">Agendamentos já atendidos <b>{n(s.returnsAttended)}</b><ArrowRight size={14}/></Link>
     <Link href="/prazos">Agendamentos em processos ativos <b>{n(s.returnsScheduled)}</b><ArrowRight size={14}/></Link>
    </div>
    <p className="lxd-subtle">Datas históricas de proximo_prazo não são consideradas vencidas; nenhuma inferência de perda de prazo judicial.</p>
   </article>
   <article className="lxd-panel"><Head eyebrow="PRÓXIMOS COMPROMISSOS" title="Agenda da organização" to="/agenda">{n(s.upcoming7)} compromissos datados nos próximos sete dias, incluindo hoje.</Head>
    {s.upcoming.length?s.upcoming.slice(0,6).map(x=><Link className="lxd-row" href={x.kind==='audiencia'?'/audiencias':x.kind==='prazo'?'/prazos':'/agenda'} key={x.id}><time>{date(x.due_on)}</time><span><strong>{x.title}</strong><small>{labels[x.kind]} · {x.responsible||'Sem responsável'}</small></span><ArrowRight size={14}/></Link>):<p className="lxd-subtle">Nenhum compromisso datado.</p>}
   </article>
   <article className="lxd-panel"><Head eyebrow="PANORAMA" title="Situação dos processos" to="/processos">Distribuição da carteira por situação interna.</Head>
    <div className="lxd-rail"><i style={{width:(100*s.active/Math.max(1,s.processes))+'%'}}/></div><div className="lxd-pair"><span>Em andamento <strong>{n(s.active)}</strong></span><span>Encerrados ou arquivados <strong>{n(s.closed)}</strong></span></div>
    <p className="lxd-subtle"><CheckCircle2 size={15}/> {n(s.excludedNoCnj)} registros sem número CNJ de 20 dígitos foram excluídos dos indicadores.</p>
   </article>
   <article className="lxd-panel"><Head eyebrow="AUDIÊNCIAS MONITORADAS" title="Conferência de pautas" to="/audiencias">Registros sem data precisam de revisão, não representam eventos já vencidos.</Head>
    {valid.hearings?<><div className="lxd-hearings">{[['Registradas',s.hearingsTotal],['Futuras',s.hearingsFuture],['Passadas',s.hearingsPast],['Sem data',s.hearingsUndated]].map(([label,value])=><div key={label}><strong>{n(value)}</strong><span>{label}</span></div>)}</div><p className="lxd-subtle">{n(s.hearingsCanceled)} canceladas ou suspensas; verificar realização das passadas nos autos.</p></>:<p className="lxd-subtle">Dados de audiências indisponíveis.</p>}
   </article>
   <article className="lxd-panel"><Head eyebrow="DISTRIBUIÇÃO" title="Tribunais da carteira" to="/processos">Processos em andamento por tribunal informado.</Head>
    <div className="lxd-bars">{s.tribunals.map(x=><div key={x.label}><div><span title={x.label}>{x.label}</span><b>{n(x.count)}</b></div><progress value={x.count} max={maxTribunal}/></div>)}</div>
   </article>
   <article className="lxd-panel"><Head eyebrow="EVOLUÇÃO" title="Cadastros dos últimos meses" to="/relatorios">Processos cadastrados, não andamentos judiciais.</Head>
    <div className="lxd-months">{s.months.map(x=><div key={x.month}><b>{n(x.count)}</b><div><i style={{height:(100*x.count/maxMonth)+'%'}}/></div><small>{x.month.slice(5)}/{x.month.slice(2,4)}</small></div>)}</div>
   </article>
  </section><p className="lxd-bottom"><BarChart3 size={15}/> Dados filtrados pelo vínculo de empresa do usuário no Supabase W1 Capital. Sempre confira prazos e audiências em documento judicial oficial.</p></>}
 </main>;
}
