'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,AlertTriangle,ArrowLeft,ArrowRight,BadgeCheck,Building2,CalendarDays,CheckCircle2,Clock3,Download,FileCheck2,FileClock,FileSpreadsheet,FileWarning,Filter,History,Landmark,Mail,MoreHorizontal,Phone,Plus,RefreshCw,RotateCcw,Search,ShieldCheck,Users,UserRound,Wallet} from 'lucide-react';
import {queueCounts,taskStatus,todayBrazil,dueDate} from '../lib/tarefas.mjs';
import {toCsvCell} from '../lib/minhas-atividades.mjs';
import InstitutionLogo from './institution-logo';
const brDate=d=>d?new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
const brTimestamp=d=>d?new Date(d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const txt=x=>String(x??'').trim();
const initial=n=>txt(n).charAt(0).toUpperCase()||'?';
const kindText=x=>x==='financeira'?'Financeira':x==='assessoria'?'Assessoria':x==='base'?'Base de contatos':x==='escritorio'?'Escritório':txt(x)||'Não classificada';
const getStatus=(c,today)=>taskStatus(c,today);
function IconHeading({icon:Icon,children,sub}){return <div className="reference-panel-title"><span className="reference-panel-title-icon"><Icon size={24}/></span><div><h2>{children}</h2>{sub&&<p>{sub}</p>}</div></div>}
function Header({page,subtitle,actions,subheading='GESTÃO OPERACIONAL · PROJECTW1SC'}){return <header className="reference-header"><div><div className="reference-overline">{subheading}</div><h1>{page}</h1><p>{subtitle}</p></div><div className="reference-actions">{actions}</div></header>}
function Action({children,icon:Icon,onClick,primary=false,disabled=false}){return <button type="button" disabled={disabled} onClick={onClick} className={primary?'reference-primary':'reference-outline'}>{Icon&&<Icon size={18}/>} {children}</button>}
function Kpi({icon:Icon,title,value,sub,kind=''}){return <div className="reference-kpi"><span className={'reference-kpi-icon '+kind}><Icon size={22}/></span><div className="reference-kpi-text"><span>{title}</span><strong className={String(value).length>10?'compact':''}>{value}</strong>{sub&&<small>{sub}</small>}</div></div>}
function Status({client,today}){
 const s=getStatus(client,today);
 const map={vencido:['danger','Vencido'],hoje:['pending','Hoje'],em_dia:['good','Em dia'],finalizado:['good','Finalizado'],sem_data:['neutral','Sem data']};
 const [css,label]=map[s.code]||['neutral',s.label];
 return <span className={'reference-status '+css}>{s.code==='vencido'?<AlertTriangle size={14}/>:s.code==='em_dia'||s.code==='finalizado'?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {label}</span>;
}
function downloadCsv(filename,headers,rows){
 const csv='\uFEFF'+[headers,...rows].map(row=>row.map(toCsvCell).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
function Pager({page,pages,count,size,onPage}){
 return <div className="reference-pager"><span>Mostrando {count?(page-1)*size+1:0}–{Math.min(page*size,count)} de {count} registros</span><div><button type="button" disabled={page===1} onClick={()=>onPage(page-1)} aria-label="Página anterior"><ArrowLeft size={16}/></button><b className="active">{page}</b><span>de {pages}</span><button type="button" disabled={page===pages} onClick={()=>onPage(page+1)} aria-label="Próxima página"><ArrowRight size={16}/></button></div></div>
}
function ClientName({client}){return <div className="reference-client-name"><span className="reference-avatar">{initial(client.name)}</span><b>{client.name}</b></div>}
function Overview({clients,kpis,last,updated,onGo,onSelectClient,onRefresh,onImport,busy}){
 const today=todayBrazil();const preview=clients.filter(c=>c.workflow_status!=='finalizado').slice(0,3);
 return <main className="reference-dashboard">
  <Header page="Visão geral" subtitle="Negociações, contatos e comprovação de quitações em um só lugar." actions={<><Action primary icon={Activity} onClick={()=>onGo('Tarefas')}>Abrir fila de tarefas</Action><Action icon={RefreshCw} onClick={onRefresh} disabled={busy}>Atualizar</Action><Action icon={Download} onClick={onImport} disabled={busy}>Importar Excel</Action></>}/>
  <div className="reference-notice"><AlertTriangle size={19}/><span><b>Sincronização: {last?.status==='concluido'?'concluída':'parcial ou pendente'}.</b> {last?.status==='concluido'?'Consulte a data da última importação.':'Confira as fontes e credenciais antes de utilizar registros não verificados.'}</span></div>
  <div className="reference-metrics">
   <Kpi icon={Users} title="Clientes importados" value={kpis.all} sub="Identificados por documento"/>
   <Kpi icon={CalendarDays} title="Retornos vencidos" value={kpis.vencidos} sub="Somente acompanhamentos ativos" kind="danger"/>
   <Kpi icon={ShieldCheck} title="Quitações verificadas" value={kpis.verify} sub="Comprovante validado" kind="good"/>
   <Kpi icon={FileWarning} title="Conflitos de origem" value={kpis.conflicts} sub="Divergências entre abas"/>
   <Kpi icon={FileSpreadsheet} title="Quitados na planilha" value={kpis.quitados} sub="Não implica comprovação"/>
   <Kpi icon={RotateCcw} title="Retornos atrasados" value={kpis.overdue} sub="Acompanhamentos em aberto"/>
   <Kpi icon={Download} title="Última importação" value={last?brTimestamp(last.started_at):'—'} sub={last?.status||'Não realizada'}/>
   <Kpi icon={Clock3} title="Atualizado na tela" value={updated?updated.toLocaleTimeString('pt-BR'):'—'} sub="Atualização desta sessão"/>
  </div>
  <section className="reference-panel reference-overview-list">
   <div className="reference-row-between"><IconHeading icon={Users} sub={clients.length+' clientes na carteira'}>Carteira de clientes</IconHeading><Action icon={ArrowRight} onClick={()=>onGo('Clientes')}>Ver carteira completa</Action></div>
   <div className="reference-table-scroll"><table className="reference-table"><thead><tr><th>Cliente</th><th>Instituição</th><th>Situação</th><th>Próximo retorno</th><th>Contato</th><th></th></tr></thead><tbody>
    {preview.map(c=><tr key={c.id}><td><ClientName client={c}/></td><td><InstitutionLogo name={c.institution} showName/></td><td><Status client={c} today={today}/></td><td><span className="reference-cell-icon"><CalendarDays size={15}/>{brDate(dueDate(c))}</span></td><td>{c.phone?<span className="reference-cell-icon"><Phone size={15}/>{c.phone}</span>:'—'}</td><td><button className="reference-more" aria-label={'Abrir '+c.name} onClick={()=>onSelectClient(c)}><MoreHorizontal size={17}/></button></td></tr>)}
   </tbody></table>{preview.length===0&&<p className="reference-empty">Nenhum acompanhamento ativo cadastrado.</p>}</div>
  </section>
 </main>
}
function Clients({clients,kpis,onGo,onSelectClient,onRefresh,onCreate,busy}){
 const today=todayBrazil(),sum=queueCounts(clients,today);
 const [q,setQ]=useState(''),[state,setState]=useState('todos'),[step,setStep]=useState('todos'),[institution,setInstitution]=useState('todos'),[focused,setFocused]=useState(null),[p,setP]=useState(1);
 const institutions=useMemo(()=>[...new Set(clients.map(c=>txt(c.institution)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[clients]);
 const list=useMemo(()=>clients.filter(c=>{
  const st=getStatus(c,today).code;const query=q.toLocaleLowerCase('pt-BR').trim();
  return (state==='todos'||st===state)&&(step==='todos'||c.stage===step)&&(institution==='todos'||c.institution===institution)&&(!query||[c.name,c.doc_digits,c.phone,c.institution,c.consultant].some(v=>txt(v).toLocaleLowerCase('pt-BR').includes(query)))
 }),[clients,q,state,step,institution,today]);
 const pages=Math.max(1,Math.ceil(list.length/8)),page=Math.min(p,pages),rows=list.slice((page-1)*8,page*8);
 const focus=list.find(c=>c.id===focused)||rows[0]||null;
 const filterSet=(fn,value)=>{fn(value);setP(1)};
 return <main className="reference-dashboard">
  <Header page="Clientes" subtitle="Gerencie a carteira de clientes e acompanhe os detalhes das negociações." actions={<><Action primary icon={Plus} onClick={onCreate}>Novo registro</Action><Action icon={RefreshCw} onClick={onRefresh} disabled={busy}>Atualizar</Action><Action icon={Download} disabled={list.length===0} onClick={()=>downloadCsv('projectw1sc-clientes.csv',['Cliente','Financeira','Situação','Próximo retorno','Consultor','Contato'],list.map(c=>[c.name,c.institution,getStatus(c,today).label,dueDate(c)||'',c.consultant,c.phone]))}>Exportar</Action></>}/>
  <div className="reference-notice"><ShieldCheck size={18}/><span>Mantenha a carteira atualizada e registre os retornos das negociações para uma gestão mais eficiente.</span></div>
  <div className="reference-metrics reference-metrics-4">
   <Kpi icon={Users} title="Total de clientes" value={clients.length} sub="Cadastros na base"/>
   <Kpi icon={CalendarDays} title="Carteira ativa" value={sum.active} sub="Acompanhamentos em andamento"/>
   <Kpi icon={Clock3} title="Retornos em atraso" value={sum.vencido} sub="Seguimentos vencidos" kind="danger"/>
   <Kpi icon={Wallet} title="Quitados informados" value={kpis.quitados} sub="Sem presumir comprovação" kind="good"/>
  </div>
  <div className="reference-client-grid">
   <section className="reference-panel reference-clients-panel">
    <div className="reference-inline-filters">
     <label className="reference-search"><Search size={18}/><input value={q} onChange={e=>filterSet(setQ,e.target.value)} placeholder="Buscar cliente por nome, CPF ou contato..."/></label>
     <label className="reference-filter-label">Situação<select value={state} onChange={e=>filterSet(setState,e.target.value)}><option value="todos">Todas</option><option value="vencido">Vencido</option><option value="hoje">Hoje</option><option value="em_dia">Em dia</option><option value="sem_data">Sem data</option><option value="finalizado">Finalizado</option></select></label>
     <label className="reference-filter-label">Etapa<select value={step} onChange={e=>filterSet(setStep,e.target.value)}><option value="todos">Todas</option>{[...new Set(clients.map(c=>c.stage).filter(Boolean))].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
     <label className="reference-filter-label">Financeira<select value={institution} onChange={e=>filterSet(setInstitution,e.target.value)}><option value="todos">Todas</option>{institutions.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    </div>
    <div className="reference-table-scroll"><table className="reference-table reference-clients-table"><thead><tr><th>Cliente</th><th>Financeira</th><th>Situação</th><th>Próximo retorno</th><th>Consultor</th><th>Contato</th><th></th></tr></thead><tbody>
     {rows.map(c=><tr key={c.id} className={focus?.id===c.id?'selected':''} onClick={()=>setFocused(c.id)}><td><ClientName client={c}/></td><td><InstitutionLogo name={c.institution} showName/></td><td><Status client={c} today={today}/></td><td>{brDate(dueDate(c))}</td><td>{c.consultant||'—'}</td><td>{c.phone||'—'}</td><td><button className="reference-more" aria-label={'Detalhes de '+c.name} onClick={e=>{e.stopPropagation();onSelectClient(c)}}><MoreHorizontal size={16}/></button></td></tr>)}
    </tbody></table>{rows.length===0&&<div className="reference-empty">Nenhum cliente corresponde aos filtros.</div>}</div>
    <Pager page={page} pages={pages} count={list.length} size={8} onPage={setP}/>
   </section>
   <aside className="reference-panel reference-client-detail">
    {focus?<><div className="reference-detail-head"><span className="reference-avatar large">{initial(focus.name)}</span><div><h2>{focus.name}</h2><span>CPF/CNPJ: {focus.doc_digits?'•••'+focus.doc_digits.slice(-4):'Não cadastrado'}</span></div><Status client={focus} today={today}/></div>
     <div className="reference-detail-grid">
      <div><Landmark size={20}/><span>Financeira<b><InstitutionLogo name={focus.institution} showName/></b></span></div>
      <div><Activity size={20}/><span>Etapa<b>{focus.stage?.replaceAll('_',' ')||'—'}</b></span></div>
      <div><UserRound size={20}/><span>Consultor<b>{focus.consultant||'—'}</b></span></div>
      <div><CalendarDays size={20}/><span>Próximo retorno<b>{brDate(dueDate(focus))}</b></span></div>
     </div>
     <div className="reference-detail-note"><div><FileCheck2 size={17}/><b>Última anotação</b></div><p>{focus.notes||'Nenhuma anotação registrada para este cliente.'}</p></div>
     <div className="reference-detail-note"><div><Activity size={17}/><b>Próxima ação</b></div><p>{getStatus(focus,today).code==='vencido'?'Retorno vencido: registrar o atendimento ou definir nova data.':getStatus(focus,today).code==='finalizado'?'Acompanhamento encerrado. Pode ser reaberto na aba Finalizados.':'Acompanhar o retorno conforme a data cadastrada.'}</p></div>
     <div className="reference-detail-actions"><Action primary icon={FileCheck2} onClick={()=>onSelectClient(focus)}>Editar cliente</Action><Action icon={History} onClick={()=>onSelectClient(focus)}>Ver histórico</Action></div>
    </>:<div className="reference-empty">Selecione um cliente para ver os detalhes.</div>}
   </aside>
  </div>
 </main>;
}
function Finished({clients,onSelectClient,onReopen,onRefresh,busy}){
 const [q,setQ]=useState(''),[order,setOrder]=useState('recentes'),[origin,setOrigin]=useState('todas'),[p,setP]=useState(1);
 const close=clients.filter(c=>c.workflow_status==='finalizado');
 const origins=useMemo(()=>[...new Set(close.map(x=>x.closure_source||x.source_tab).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[clients]);
 const list=useMemo(()=>close.filter(c=>(origin==='todas'||(c.closure_source||c.source_tab)===origin)&&(!q.trim()||[c.name,c.institution,c.source_tab,c.closure_source].some(x=>txt(x).toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR').trim())))).sort((a,b)=>order==='recentes'?String(b.finished_at||'').localeCompare(String(a.finished_at||'')):String(a.finished_at||'').localeCompare(String(b.finished_at||''))),[close,q,origin,order]);
 const pages=Math.max(1,Math.ceil(list.length/8)),page=Math.min(p,pages),rows=list.slice((page-1)*8,page*8);
 const month=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}).slice(0,7);
 return <main className="reference-dashboard">
  <Header page="Finalizados" subtitle="Área que contém apenas acompanhamentos encerrados ou concluídos." actions={<><Action icon={RefreshCw} onClick={onRefresh} disabled={busy}>Atualizar</Action><Action primary icon={Download} disabled={list.length===0} onClick={()=>downloadCsv('projectw1sc-finalizados.csv',['Cliente','Instituição','Data de encerramento','Origem','Situação'],list.map(x=>[x.name,x.institution,x.finished_at?.slice(0,10)||'',x.closure_source||x.source_tab,'Finalizado']))}>Exportar lista</Action></>}/>
  <div className="reference-metrics reference-metrics-4">
   <Kpi icon={CheckCircle2} title="Total finalizados" value={close.length} sub="Acompanhamentos encerrados"/>
   <Kpi icon={CalendarDays} title="Registrados este mês" value={close.filter(x=>x.finished_at?.startsWith(month)).length} sub="Data registrada no CRM"/>
   <Kpi icon={ShieldCheck} title="Quitados informados" value={close.filter(x=>x.source_status==='quitado_na_planilha').length} sub="Não equivale a comprovante" kind="good"/>
   <Kpi icon={RotateCcw} title="Reabertos atualmente" value={clients.filter(x=>x.workflow_override==='ativo'&&x.workflow_status==='ativo').length} sub="Fora da lista de encerrados"/>
  </div>
  <section className="reference-panel reference-finalized">
   <div className="reference-row-between"><IconHeading icon={CheckCircle2} sub="Acompanhamentos encerrados, com histórico e possibilidade de reabertura.">Registros finalizados</IconHeading></div>
   <div className="reference-inline-filters"><label className="reference-search"><Search size={18}/><input value={q} onChange={e=>{setQ(e.target.value);setP(1)}} placeholder="Buscar por cliente, instituição ou origem..."/></label><label className="reference-filter-button"><Filter size={16}/><select value={origin} onChange={e=>{setOrigin(e.target.value);setP(1)}}><option value="todas">Todas as origens</option>{origins.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label className="reference-filter-button"><CalendarDays size={16}/><select value={order} onChange={e=>setOrder(e.target.value)}><option value="recentes">Mais recentes</option><option value="antigos">Mais antigos</option></select></label><button className="reference-text-button" onClick={()=>{setQ('');setOrigin('todas');setOrder('recentes');setP(1)}}>Limpar filtros</button></div>
   <div className="reference-table-scroll"><table className="reference-table"><thead><tr><th>Cliente</th><th>Instituição</th><th>Encerramento</th><th>Origem</th><th>Status</th><th></th></tr></thead><tbody>
     {rows.map(c=><tr key={c.id}><td><ClientName client={c}/></td><td><InstitutionLogo name={c.institution} showName/></td><td><span className="reference-cell-icon"><CalendarDays size={15}/>{brTimestamp(c.finished_at)}</span></td><td><span className="reference-cell-icon"><FileCheck2 size={15}/>{c.closure_source||c.source_tab||'Não informado'}</span></td><td><span className="reference-status good"><CheckCircle2 size={14}/> Finalizado</span></td><td><div className="reference-row-actions"><Action icon={RotateCcw} onClick={()=>onReopen(c)}>Reabrir</Action><Action icon={FileCheck2} onClick={()=>onSelectClient(c)}>Detalhes</Action></div></td></tr>)}
   </tbody></table>{!rows.length&&<div className="reference-empty">Nenhum acompanhamento finalizado nesta seleção.</div>}</div>
   <Pager page={page} pages={pages} count={list.length} size={8} onPage={setP}/>
  </section>
 </main>;
}
function Institutions({parties,onRefresh,onCreate,busy}){
 const [q,setQ]=useState(''),[kind,setKind]=useState('todas'),[p,setP]=useState(1);
 const items=useMemo(()=>parties.filter(x=>(kind==='todas'||x.kind===kind)&&(!q.trim()||[x.name,x.kind,x.contact].some(v=>txt(v).toLocaleLowerCase('pt-BR').includes(q.toLocaleLowerCase('pt-BR').trim())))),[parties,kind,q]);
 const pages=Math.max(1,Math.ceil(items.length/12)),page=Math.min(p,pages),rows=items.slice((page-1)*12,page*12);
 const kinds=[...new Set(parties.map(x=>x.kind).filter(Boolean))].sort();
 return <main className="reference-dashboard">
  <Header page="Instituições" subtitle="Instituições financeiras, assessorias e contatos vinculados ao CRM." actions={<><Action icon={Plus} primary onClick={onCreate}>Nova instituição</Action><Action icon={RefreshCw} disabled={busy} onClick={onRefresh}>Atualizar</Action></>}/>
  <div className="reference-notice"><AlertTriangle size={19}/><span>Confira os contatos de cada instituição antes de utilizá-los em uma negociação.</span></div>
  <div className="reference-metrics reference-metrics-4">
   <Kpi icon={Building2} title="Total de instituições" value={parties.length} sub="Cadastradas no CRM"/>
   <Kpi icon={ShieldCheck} title="Financeiras" value={parties.filter(p=>p.kind==='financeira').length} sub="Instituições financeiras" kind="good"/>
   <Kpi icon={Users} title="Assessorias" value={parties.filter(p=>p.kind==='assessoria').length} sub="Escritórios e assessorias"/>
   <Kpi icon={FileCheck2} title="Contatos informados" value={parties.filter(p=>!!txt(p.contact)).length} sub="Contato disponível na base"/>
  </div>
  <section className="reference-panel reference-institutions">
   <div className="reference-inline-filters"><label className="reference-search"><Search size={18}/><input value={q} onChange={e=>{setQ(e.target.value);setP(1)}} placeholder="Buscar instituição por nome ou contato..."/></label><label className="reference-filter-button"><Filter size={16}/><select value={kind} onChange={e=>{setKind(e.target.value);setP(1)}}><option value="todas">Todas as categorias</option>{kinds.map(x=><option key={x} value={x}>{kindText(x)}</option>)}</select></label></div>
   <div className="reference-table-scroll"><table className="reference-table"><thead><tr><th>Instituição</th><th>Categoria</th><th>Contato principal</th><th>Última atualização</th><th></th></tr></thead><tbody>
     {rows.map(c=><tr key={c.id}><td><div className="reference-client-name"><InstitutionLogo name={c.name} size="lg"/><b>{c.name}</b></div></td><td><span className="reference-status neutral"><Landmark size={14}/>{kindText(c.kind)}</span></td><td>{c.contact||'Contato não cadastrado'}</td><td>{brTimestamp(c.updated_at)}</td><td><span className="reference-status good"><CheckCircle2 size={13}/> Cadastrada</span></td></tr>)}
   </tbody></table>{!rows.length&&<div className="reference-empty">Nenhuma instituição encontrada.</div>}</div>
   <Pager page={page} pages={pages} count={items.length} size={12} onPage={setP}/>
  </section>
 </main>;
}
export default function ReferencePages(props){
 const {page}=props;
 if(page==='Visão geral')return <Overview {...props}/>;
 if(page==='Clientes')return <Clients {...props}/>;
 if(page==='Finalizados')return <Finished {...props}/>;
 if(page==='Instituições')return <Institutions {...props}/>;
 return null;
}
