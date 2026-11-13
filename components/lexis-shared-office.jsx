'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,Archive,BarChart3,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,ClipboardList,Download,Edit3,FileText,Gavel,History,Plus,Printer,RefreshCw,Search,ShieldCheck,Users} from 'lucide-react';
import {mapLexisProcess,resolveCompanyAccess,portfolioUpdate,PROCESS_FIELDS,processSearchField,likeTerm,normalizedCnj,validDay,dailyAttendanceSummary} from '../lib/lexis-shared-portfolio.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
import {browseOfficialDjenNumber} from '../lib/blackhole-public-djen-browser.mjs';
import {periodBounds} from '../lib/report.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
import {toCsvCell} from '../lib/minhas-atividades.mjs';
import {TeamReport} from './lexis-team-report';
import {adaptLexisTeamReport} from '../lib/lexis-team-report-adapter.mjs';
import InfinitumLegacyClients from './infinitum-legacy-clients';
const PAGE=75;
const DATE_LABEL=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'—';
const STATUS={ativo:'Em andamento',em_andamento:'Em andamento',suspenso:'Suspenso',encerrado:'Encerrado',excluido:'Excluído (arquivado)'};
const FIELDS_CLIENT=['cliente','telefone','email','cpf'];
const FIELDS_PROCESS=['cliente','protocolo_ref','tribunal','advogado','observacoes','proximo_retorno','status_interno'];
const initialForm=p=>({cliente:p.client_name||'',telefone:p.phone||'',email:p.email||'',cpf:p.cpf||'',tribunal:p.tribunal||'',advogado:p.advogado||'',observacoes:p.observacoes||'',proximo_retorno:p.next_attendance||'',status_interno:p.status||'ativo'});
const qFilter=(query,type)=>({field:processSearchField(type),text:likeTerm(query)});
function Summary({title,count,href}){return <Link href={href} className="inf-stat" style={{textDecoration:'none'}}><label>{title}</label><strong>{Number(count||0).toLocaleString('pt-BR')}</strong></Link>;}
export default function LexisSharedOffice({area='dashboard',db,session}){
 const [profile,setProfile]=useState(null),[company,setCompany]=useState(''),[team,setTeam]=useState([]);
 const [authChecking,setAuthChecking]=useState(true),[rows,setRows]=useState([]),[total,setTotal]=useState(0);
 const [page,setPage]=useState(0),[type,setType]=useState('cliente'),[draft,setDraft]=useState(''),[search,setSearch]=useState('');
 const [activeFilter,setActiveFilter]=useState('em_andamento'),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(''),[editing,setEditing]=useState(null),[mode,setMode]=useState('processo'),[form,setForm]=useState({});
 const [selected,setSelected]=useState(null),[history,setHistory]=useState([]),[attendNote,setAttendNote]=useState(''),[nextDate,setNextDate]=useState('');
 const [confirmed,setConfirmed]=useState(false),[consulted,setConsulted]=useState(null);
 const [period,setPeriod]=useState('mes'),[scope,setScope]=useState('empresa'),[attendance,setAttendance]=useState([]),[reportTotal,setReportTotal]=useState(0);
 const [reportBusy,setReportBusy]=useState(false),[teamStats,setTeamStats]=useState([]),[selectedMode,setSelectedMode]=useState('atendimento');
 useEffect(()=>{
  let live=true;
  (async()=>{
   try{
    const {data,error}=await db.from('usuarios').select('auth_user_id,empresa_id,nome,cargo,role').eq('auth_user_id',session.user.id).limit(2);
    if(error)throw Error(error.message);
    const current=resolveCompanyAccess(data||[],session.user.id);
    if(!current)throw Error('Conta sem vínculo único e autorizado com empresa do LexisPredict.');
    if(!live)return;
    setProfile(current);
    const [users,empresa]=await Promise.all([
      db.from('usuarios').select('auth_user_id,empresa_id,nome,cargo').eq('empresa_id',current.empresa_id).limit(200),
      db.from('empresas').select('nome').eq('id',current.empresa_id).maybeSingle()
    ]);
    if(!live)return;
    if(users.error)throw Error('Não foi possível confirmar os membros da organização: '+users.error.message);
    setTeam((users.data||[]).filter(u=>u.empresa_id===current.empresa_id));
    setCompany(empresa.data?.nome||'Empresa');
   }catch(e){if(live)setNotice('Acesso Lexis indisponível: '+e.message)}
   finally{if(live)setAuthChecking(false)}
  })();
  return()=>{live=false};
 },[db,session.user.id]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id||area==='reports')return;
  setLoading(true);
  try{
   let q=db.from('processos').select(PROCESS_FIELDS,{count:'exact'}).eq('empresa_id',profile.empresa_id);
   if(search){const f=qFilter(search,type);q=q.ilike(f.field,f.text)}
   if(activeFilter==='em_andamento')q=q.or('status_interno.is.null,and(status_interno.not.ilike.ENCERRADO,status_interno.not.ilike.EXCLUIDO)');
   if(activeFilter==='encerrado'||activeFilter==='excluido')q=q.ilike('status_interno',activeFilter);
   const {data,error,count}=await q.order('updated_at',{ascending:false,nullsFirst:false}).range(page*PAGE,(page+1)*PAGE-1);
   if(error)throw Error(error.message);
   setRows((data||[]).map(mapLexisProcess));setTotal(count??(data||[]).length);
  }catch(e){setNotice('Erro ao buscar carteira Lexis: '+e.message)}
  finally{setLoading(false)}
 },[db,profile?.empresa_id,page,search,type,activeFilter,area]);
 useEffect(()=>{load()},[load]);
 const lastTotalPages=Math.max(1,Math.ceil(total/PAGE));
 const attend=useCallback(async(row)=>{
  if(!profile?.empresa_id)return;
  setSelected(row);setSelectedMode('atendimento');setAttendNote('');setNextDate(row.next_attendance||'');setConfirmed(false);setConsulted(null);
  try{
   const {data,error}=await db.from('tarefas_realizadas').select('id,descricao,categoria,data_realizacao,responsavel_auth_user_id,contato_cliente_confirmado,created_at')
    .eq('empresa_id',profile.empresa_id).eq('processo_id',row.id).order('created_at',{ascending:false}).limit(60);
   if(error)throw Error(error.message);
   setHistory(data||[]);
  }catch(e){setHistory([]);setNotice('Histórico não carregado: '+e.message)}
 },[db,profile?.empresa_id]);
 const saveAttendance=async e=>{
  e.preventDefault();if(!selected||busy)return;
  if(attendNote.trim().length<3){setNotice('Descreva o atendimento realizado.');return}
  if(nextDate&&!validDay(nextDate)){setNotice('Data do próximo retorno inválida.');return}
  setBusy(true);setNotice('');
  try{
   const {data,error}=await db.rpc('infinitum_registrar_atendimento',{
    p_processo_id:selected.id,p_descricao:attendNote.trim(),p_proximo_retorno:nextDate||null,p_contato_confirmado:confirmed
   });
   if(error||data?.ok!==true)throw Error(error?.message||'Atendimento não confirmado pelo banco.');
   setNotice('Atendimento registrado: '+data.responsavel+' · '+DATE_LABEL(data.ultimo_atendimento)+' · próximo retorno '+DATE_LABEL(data.proximo_atendimento)+'.');
   setAttendNote('');setSelected(null);await load();
  }catch(e){setNotice('Atendimento não registrado: '+e.message)}
  finally{setBusy(false)}
 };
 const startEdit=(p,what)=>{setSelected(null);setEditing(p);setMode(what);setForm(initialForm(p));setNotice('')};
 const saveEdit=async e=>{
  e.preventDefault();if(!editing||busy||!profile?.empresa_id)return;
  const fields=mode==='cliente'?FIELDS_CLIENT:FIELDS_PROCESS.filter(f=>f!=='protocolo_ref');
  let patch;try{patch=portfolioUpdate(Object.fromEntries(fields.map(f=>[f,form[f]])))}catch(err){setNotice(err.message);return}
  setBusy(true);
  try{
   const {data,error}=await db.from('processos').update({...patch,updated_at:new Date().toISOString()})
    .eq('id',editing.id).eq('empresa_id',profile.empresa_id).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Banco não confirmou alteração.');
   setNotice((mode==='cliente'?'Cliente':'Processo')+' atualizado na carteira do Lexis.');setEditing(null);await load();
  }catch(err){setNotice('Edição não confirmada: '+err.message)}finally{setBusy(false)}
 };
 const changeStatus=async(p,status)=>{
  if(status==='excluido'&&!window.confirm('Arquivar este registro sem apagar seus dados e históricos?'))return;
  if(!profile?.empresa_id||busy)return;setBusy(true);
  try{
   const patch=portfolioUpdate({status_interno:status});
   const {data,error}=await db.from('processos').update({...patch,updated_at:new Date().toISOString()})
    .eq('id',p.id).eq('empresa_id',profile.empresa_id).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Registro não confirmado');
   setNotice(status==='excluido'?'Registro arquivado, sem exclusão física.':status==='encerrado'?'Processo encerrado no controle interno.':'Processo mantido em andamento.');
   await load();
  }catch(e){setNotice('Não foi possível alterar situação: '+e.message)}finally{setBusy(false)}
 };
 const consult=async p=>{
  if(!p.process_number||!normalizedCnj(p.process_number)){setNotice('Número CNJ incompleto. Consulta oficial não iniciada.');return}
  setSelected(p);setSelectedMode('consulta');setConsulted(null);setBusy(true);setNotice('Consultando DJEN e DataJud somente por solicitação...');
  try{
   const {data:{session:s}}=await db.auth.getSession();
   if(!s?.access_token)throw Error('Sessão expirada.');
   const result=await consultHistoricalCase({
    number:normalizedCnj(p.process_number),source:'auto',
    fetchServer:async({number,source,start,end,page})=>{
     const qs=new URLSearchParams({numero:number,fonte:source,pagina:String(page),...(start?{inicio:start}:{}),...(end?{fim:end}:{})});
     const resp=await fetch('/api/processos/consulta?'+qs,{headers:{Authorization:'Bearer '+s.access_token},cache:'no-store'});
     return resp.json();
    },
    fetchBrowser:async({number,start,end,page})=>browseOfficialDjenNumber({number,start,end,page})
   });
   setConsulted(result);
   setNotice(result.notice||'Consulta terminada; confira quais fontes responderam.');
  }catch(e){setNotice('Consulta judicial não confirmada: '+e.message)}finally{setBusy(false)}
 };
 const loadReport=useCallback(async()=>{
  if(!profile?.empresa_id||area!=='reports')return;
  setReportBusy(true);
  try{
   const bounds=periodBounds(period,todayBrazil());
   const [r,caseCount,teamData]=await Promise.all([
    db.from('tarefas_realizadas').select('id,titulo,descricao,protocolo_ref,data_realizacao,responsavel_auth_user_id,processo_id,categoria,contato_cliente_confirmado')
     .eq('empresa_id',profile.empresa_id).gte('data_realizacao',bounds.start).lt('data_realizacao',bounds.endExclusive).order('data_realizacao',{ascending:false}).limit(2500),
    db.from('processos').select('id',{count:'exact',head:true}).eq('empresa_id',profile.empresa_id),
    db.rpc('infinitum_resumo_equipe_v2')
   ]);
   if(r.error||caseCount.error)throw Error(r.error?.message||caseCount.error?.message);
   setAttendance(r.data||[]);setReportTotal(caseCount.count??0);setTeamStats(teamData.error?[]:(teamData.data||[]));
   if(teamData.error)setNotice('Detalhamento de equipe indisponível: '+teamData.error.message);
  }catch(e){setNotice('Relatório indisponível: '+e.message)}
  finally{setReportBusy(false)}
 },[db,profile?.empresa_id,area,period]);
 useEffect(()=>{loadReport()},[loadReport]);
 const reportRows=useMemo(()=>scope==='meus'?attendance.filter(x=>x.responsavel_auth_user_id===session.user.id):attendance,[attendance,scope,session.user.id]);
 const summary=useMemo(()=>dailyAttendanceSummary(reportRows,team),[reportRows,team]);
 const teamReport=useMemo(()=>adaptLexisTeamReport({teamStats,activities:reportRows,period,bounds:periodBounds(period,todayBrazil())}),[teamStats,reportRows,period]);
 function exportCsv(){
  const lines=[['Dia','Atendimentos'],...summary.byDay.map(x=>[x.day,x.count])];
  const csv='\uFEFF'+lines.map(x=>x.map(toCsvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='infinitum-relatorio-lexis.csv';a.click();URL.revokeObjectURL(url);
 }
 if(authChecking)return <main className="reference-auth">Validando vínculo com a organização do LexisPredict...</main>;
 if(!profile)return <main className="reference-auth" role="alert">Acesso bloqueado. {notice||'Usuário sem vínculo ativo com empresa do LexisPredict.'}</main>;
 if(area==='reports')return <main className="reference-dashboard" data-lexis-shared="reports">
  <header className="reference-header"><div><div className="reference-overline">LEXISPREDICT · RELATÓRIO EMPRESARIAL</div><h1>Relatórios</h1><p>{company} · todos os dados provêm do banco principal LexisPredict.</p></div>
   <div className="reference-actions"><button className="inf-btn" onClick={loadReport} disabled={reportBusy}><RefreshCw size={16}/> Atualizar</button>
   <button className="inf-btn" onClick={exportCsv}><Download size={16}/> CSV</button><button className="inf-btn" onClick={()=>window.print()}><Printer size={16}/> PDF / Imprimir</button></div></header>
  {notice&&<div className="inf-note" role="status">{notice}</div>}
  <div className="inf-row-end" style={{justifyContent:'flex-start',gap:12,flexWrap:'wrap'}}>
   <label>Período <select value={period} onChange={e=>setPeriod(e.target.value)}><option value="esta_semana">Esta semana</option><option value="semana_passada">Semana passada</option><option value="mes">Mês atual</option></select></label>
   <label>Escopo <select value={scope} onChange={e=>setScope(e.target.value)}><option value="empresa">Toda a organização</option><option value="meus">Somente meus registros</option></select></label>
  </div>
  <div className="inf-grid"><Summary title="Processos na empresa" count={reportTotal} href="/processos"/><Summary title="Atendimentos registrados no período" count={summary.total} href="/relatorios"/><Summary title="Processos atendidos" count={summary.uniqueProcesses} href="/processos"/><Summary title="Colaboradores na organização" count={team.length} href="/relatorios"/></div>
  {reportBusy&&<p className="inf-note">Consultando indicadores oficiais do banco...</p>}
  <section className="inf-panel"><h2>Atendimentos por responsável</h2><p>Somente atendimentos realmente registrados na tabela de histórico do Lexis.</p>
   <div className="office-records">{summary.byUser.length?summary.byUser.map(u=><div className="office-record" key={u.id}><strong>{u.name}</strong> · {u.count} atendimento(s)</div>):<p>Sem atendimentos confirmados no período.</p>}</div>
  </section>
  <section className="inf-panel"><h2>Atendimentos por dia</h2><div className="office-records">{summary.byDay.map(d=><div className="office-record" key={d.day}><strong>{DATE_LABEL(d.day)}</strong> · {d.count}</div>)}</div></section>
  <TeamReport data={teamStats.length?teamReport:null} currentUserId={session.user.id}/>
  <p className="inf-note">O relatório de equipe acima utiliza literalmente o componente do LexisPredict. Painéis de Hermes, auditoria avançada e relatórios executivos ainda exigem integração específica; dados sem origem comprovada são exibidos como indisponíveis.</p>
 </main>;
 return <main className="reference-dashboard" data-lexis-shared="portfolio">
  <header className="reference-header"><div><div className="reference-overline">INFINITUM · BASE PRINCIPAL LEXISPREDICT</div><h1>{area==='clients'?'Clientes':area==='cases'?'Processos':'Carteira da organização'}</h1>
  <p>{company} · consultas da empresa inteira, conforme permissões do LexisPredict.</p></div>
  <div className="reference-actions"><button type="button" className="inf-btn" onClick={load} disabled={loading}><RefreshCw size={16}/> Atualizar</button><Link href="/relatorios" className="inf-btn"><BarChart3 size={16}/> Relatórios</Link></div></header>
  {notice&&<div className="inf-note" role="status">{notice}</div>}
  <div className="inf-grid"><Summary title="Registros localizados" count={total} href="/processos"/><Summary title="Membros da organização" count={team.length} href="/relatorios"/><Summary title="Nesta página" count={rows.length} href="/clientes"/></div>
  <section className="inf-panel"><h2><Search size={18}/> Buscar em toda a organização</h2>
   <form className="inf-row-end" style={{justifyContent:'flex-start',gap:10,flexWrap:'wrap'}} onSubmit={e=>{e.preventDefault();setPage(0);setSearch(draft.trim())}}>
    <select aria-label="Campo da pesquisa" value={type} onChange={e=>{setType(e.target.value);setPage(0);setSearch('');setDraft('')}}><option value="cliente">Cliente</option><option value="numero">Número processual</option><option value="tribunal">Tribunal</option></select>
    <input aria-label="Pesquisar em toda empresa" placeholder="Buscar cliente, número CNJ ou tribunal" value={draft} onChange={e=>setDraft(e.target.value)} style={{minWidth:220,flex:1}}/>
    <button className="inf-btn primary" type="submit"><Search size={16}/> Buscar</button>
    <button className="inf-btn" type="button" onClick={()=>{setDraft('');setSearch('');setPage(0)}}>Limpar</button>
   </form>
   <label>Mostrar <select value={activeFilter} onChange={e=>{setActiveFilter(e.target.value);setPage(0)}}><option value="todos">Todos</option><option value="em_andamento">Em andamento</option><option value="encerrado">Encerrados internamente</option><option value="excluido">Arquivados / excluídos da vista</option></select></label>
  </section>
  {loading&&<p className="inf-note">Carregando página de processos...</p>}
  <section className="inf-panel"><h2>{area==='clients'?'Cadastros de clientes por processo':'Processos cadastrados no LexisPredict'}</h2>
   <p>Cada linha representa um processo real. Clientes homônimos não são unidos automaticamente.</p>
   <div className="office-records">{rows.map(p=><article className="office-record" key={p.id}>
    <div className="inf-row-end" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{p.client_name||'Cliente não identificado'}</strong><p>{p.process_number||'Sem número CNJ'} · {p.tribunal||'Tribunal não informado'}</p>
     <small>{STATUS[p.status]||'Em andamento'} · Último atendimento: {DATE_LABEL(p.last_attendance)} · Próximo: {DATE_LABEL(p.next_attendance)} · Responsável: {p.last_responsible||'Não registrado'}</small></div>
    </div>
    <div className="inf-row-end" style={{justifyContent:'flex-start',gap:6,flexWrap:'wrap'}}>
     <button className="inf-btn" onClick={()=>startEdit(p,'cliente')}><Edit3 size={14}/> Editar cliente</button>
     <button className="inf-btn" onClick={()=>startEdit(p,'processo')}><FileText size={14}/> Editar processo</button>
     <button className="inf-btn primary" onClick={()=>attend(p)}><ClipboardList size={14}/> Registrar atendimento</button>
     <button className="inf-btn" onClick={()=>consult(p)} disabled={busy||!normalizedCnj(p.process_number)}><Gavel size={14}/> Consultar</button>
     {p.status!=='encerrado'&&<button className="inf-btn" onClick={()=>changeStatus(p,'encerrado')} disabled={busy}><CheckCircle2 size={14}/> Encerrar</button>}
     {p.status!=='em_andamento'&&<button className="inf-btn" onClick={()=>changeStatus(p,'em_andamento')} disabled={busy}><Activity size={14}/> Em andamento</button>}
     {p.status!=='excluido'&&<button className="inf-btn" onClick={()=>changeStatus(p,'excluido')} disabled={busy}><Archive size={14}/> Excluir da vista</button>}
    </div>
   </article>)}
   {!rows.length&&!loading&&<p>Nenhum registro encontrado com os filtros atuais.</p>}</div>
   <div className="inf-row-end"><button type="button" className="inf-btn" disabled={page<=0||loading} onClick={()=>setPage(x=>Math.max(0,x-1))}><ChevronLeft size={16}/> Anterior</button>
   <span>Página {page+1} de {lastTotalPages}</span>
   <button type="button" className="inf-btn" disabled={page+1>=lastTotalPages||loading} onClick={()=>setPage(x=>x+1)}>Próxima <ChevronRight size={16}/></button></div>
  </section>
  {area==='clients'&&<InfinitumLegacyClients db={db} profile={profile} team={team}/>}
  {editing&&<section className="inf-panel" aria-label="Edição de cadastro"><h2>Editar {mode==='cliente'?'cliente':'processo'} · #{editing.id}</h2>
   <form onSubmit={saveEdit}><div className="inf-fields">
    {(mode==='cliente'?FIELDS_CLIENT:FIELDS_PROCESS.filter(f=>f!=='protocolo_ref')).map(field=>(
     <label key={field}>{({cliente:'Cliente',telefone:'Telefone',email:'E-mail',cpf:'CPF',tribunal:'Tribunal',advogado:'Advogado',observacoes:'Observações',proximo_retorno:'Próximo atendimento',status_interno:'Situação interna'})[field]||field}
      {field==='status_interno'?<select value={form[field]||'ativo'} onChange={e=>setForm({...form,[field]:e.target.value})}><option value="ativo">Ativo</option><option value="em_andamento">Em andamento</option><option value="suspenso">Suspenso</option><option value="encerrado">Encerrado</option><option value="excluido">Excluído (arquivado)</option></select>:
       field==='observacoes'?<textarea value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>:
       <input type={field==='proximo_retorno'?'date':'text'} value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>}</label>
    ))}
   </div><div className="inf-row-end"><button className="inf-btn primary" disabled={busy}>Salvar alterações</button><button type="button" className="inf-btn" onClick={()=>setEditing(null)}>Cancelar</button></div></form>
  </section>}
  {selected&&<section className="inf-panel" aria-label="Registrar atendimento"><h2><History size={18}/> Atendimento · {selected.client_name||selected.process_number}</h2>
   <p>Último: {DATE_LABEL(selected.last_attendance)} · Próximo: {DATE_LABEL(selected.next_attendance)} · Responsável: {selected.last_responsible||'Não registrado'}</p>
   {selectedMode==='atendimento'&&<form onSubmit={saveAttendance}><div className="inf-fields">
    <label>Resumo do atendimento realizado<textarea value={attendNote} onChange={e=>setAttendNote(e.target.value)} minLength={3} maxLength={3000} required/></label>
    <label>Próximo atendimento<input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label>
    <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Contato com o cliente confirmado</label>
   </div><p className="inf-note">Responsável será registrado automaticamente com seu login Lexis: <b>{profile.nome}</b>. O histórico anterior não será sobrescrito.</p>
   <div className="inf-row-end"><button type="submit" className="inf-btn primary" disabled={busy}>Confirmar atendimento</button><button className="inf-btn" type="button" onClick={()=>{setSelected(null);setConsulted(null)}}>Fechar</button></div></form>}
   {history.length>0&&<div className="office-records"><h3>Histórico de atendimentos e atividades</h3>{history.map(x=><div className="office-record" key={x.id}><strong>{DATE_LABEL(x.data_realizacao)}</strong> · {team.find(p=>p.auth_user_id===x.responsavel_auth_user_id)?.nome||'Responsável registrado'} · {x.categoria}<p>{x.descricao}</p></div>)}</div>}
   {consulted&&<div className="office-records"><h3>Consulta oficial</h3><p>{consulted.notice}</p><p>DJEN: {consulted.sourceStatus?.djen} · DataJud: {consulted.sourceStatus?.datajud}</p>{(consulted.items||[]).slice(0,50).map((x,i)=><div className="office-record" key={i}>{String(x.title||x.description||x.texto||'Movimentação sem descrição').slice(0,400)}</div>)}</div>}
  </section>}
 </main>;
}
