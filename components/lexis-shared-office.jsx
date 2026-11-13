'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
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
import PortfolioDialog from './portfolio-dialog';
import JudicialConsultationResult,{JudicialEvents} from './judicial-consultation-result';
import {loadPortfolioHistory} from '../lib/portfolio-history.mjs';
import {responsibleDisplay,processStatus} from '../lib/lexis-operations.mjs';
import {classifyLexisReturn} from '../lib/lexis-return-kpis.mjs';
const PAGE=75;
const DATE_LABEL=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'—';
const STATUS={ativo:'Em andamento',em_andamento:'Em andamento',suspenso:'Suspenso',encerrado:'Encerrado',excluido:'Excluído (arquivado)'};
const FIELDS_CLIENT=['cliente','telefone','email','cpf'];
const FIELDS_PROCESS=['cliente','protocolo_ref','tribunal','advogado','observacoes','proximo_retorno','proximo_prazo','status_interno'];
const initialForm=p=>({cliente:p.client_name||'',telefone:p.phone||'',email:p.email||'',cpf:p.cpf||'',tribunal:p.tribunal||'',advogado:p.advogado||'',observacoes:p.observacoes||'',proximo_retorno:p.next_attendance||'',proximo_prazo:p.next_deadline||'',status_interno:p.status==='outro'?'preservar':p.status||'ativo'});
const qFilter=(query,type)=>({field:processSearchField(type),text:likeTerm(query)});
const recentPeriod=()=>{const end=todayBrazil(),start=new Date(end+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-30);return {start:start.toISOString().slice(0,10),end,source:'auto',page:1}};
function Summary({title,count,href}){return <Link href={href} className="inf-stat" style={{textDecoration:'none'}}><label>{title}</label><strong>{Number(count||0).toLocaleString('pt-BR')}</strong></Link>;}
export default function LexisSharedOffice({area='dashboard',db,session}){
 const [profile,setProfile]=useState(null),[company,setCompany]=useState(''),[team,setTeam]=useState([]);
 const [authChecking,setAuthChecking]=useState(true),[rows,setRows]=useState([]),[total,setTotal]=useState(0);
 const [activeFilter,setActiveFilter]=useState('em_andamento'),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(''),[editing,setEditing]=useState(null),[mode,setMode]=useState('processo'),[form,setForm]=useState({});

 const [deadlineRows,setDeadlineRows]=useState([]);
 const [hearingRows,setHearingRows]=useState([]);
 const [calendarLoading,setCalendarLoading]=useState(false);

 const loadDeadlinesFromProcessos=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setCalendarLoading(true);setNotice('');
  try{
   // Prazos/retornos a partir da carteira Lexis (proximo_retorno).
   let q=db.from('processos').select(PROCESS_FIELDS,{count:'exact'}).eq('empresa_id',profile.empresa_id)
    .not('proximo_retorno','is',null).order('proximo_retorno',{ascending:true}).limit(500);
   if(activeFilter==='em_andamento')q=q.or('status_interno.eq.ativo,status_interno.eq.em_andamento,status_interno.is.null');
   if(activeFilter==='encerrado')q=q.eq('status_interno','encerrado');
   const {data,error}=await q;
   if(error)throw Error(error.message);
   const today=todayBrazil();
   const mapped=(data||[]).map(r=>{
    const p=mapLexisProcess(r);
    const due=String(p.next_attendance||'').slice(0,10);
    return {
     id:p.id,
     title:p.client_name||p.process_number||'Retorno',
     due_on:due,
     kind:'retorno',
     status:due&&due<today?'vencido':'aberto',
     process_number:p.process_number,
     client_name:p.client_name,
     tribunal:p.tribunal,
     advogado:p.advogado,
     responsible:p.advogado||'',
     notes:p.observacoes||''
    };
   }).filter(x=>x.due_on);
   setDeadlineRows(mapped);
  }catch(e){setNotice('Não foi possível carregar prazos/retornos: '+e.message);setDeadlineRows([]);}
  finally{setCalendarLoading(false);}
 },[db,profile,activeFilter]);

 const loadHearings=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setCalendarLoading(true);setNotice('');
  try{
   // Preferência: tabela oficial do Lexis se existir; senão, retornos futuros como agenda operacional.
   const aud=await db.from('audiencias_monitoradas')
    .select('id,processo_id,protocolo_ref,cliente,advogado,tribunal,tipo,data_evento,data_fim,hora_local,modalidade,situacao,fonte,fonte_url,portal_url')
    .eq('empresa_id',profile.empresa_id)
    .order('data_evento',{ascending:true})
    .limit(400);
   if(!aud.error&&Array.isArray(aud.data)){
    setHearingRows(aud.data.map(a=>({
     id:a.id,
     title:a.cliente||a.protocolo_ref||'Audiência',
     due_on:String(a.data_evento||'').slice(0,10),
     kind:'audiencia',
     status:a.situacao||'aberta',
     process_number:a.protocolo_ref,
     client_name:a.cliente,
     tribunal:a.tribunal,
     advogado:a.advogado,
     tipo:a.tipo,
     hora:a.hora_local,
     fonte:a.fonte,
     fonte_url:a.fonte_url||a.portal_url,
     notes:[a.modalidade,a.tipo].filter(Boolean).join(' · ')
    })).filter(x=>x.due_on));
   }else{
    // Fallback: não inventa audiência a partir de retorno; avisa e lista vazia.
    setHearingRows([]);
    if(aud.error)setNotice('Tabela de audiências oficiais indisponível neste Supabase ('+aud.error.message+'). Use Prazos para retornos da carteira ou habilite audiencias_monitoradas.');
   }
  }catch(e){setNotice('Não foi possível carregar audiências: '+e.message);setHearingRows([]);}
  finally{setCalendarLoading(false);}
 },[db,profile]);

 useEffect(()=>{
  if(!profile?.empresa_id)return;
  if(area==='deadlines')loadDeadlinesFromProcessos();
  if(area==='audiencias')loadHearings();
 },[area,profile,loadDeadlinesFromProcessos,loadHearings]);

 const [page,setPage]=useState(0),[type,setType]=useState('cliente'),[draft,setDraft]=useState(''),[search,setSearch]=useState('');
 useEffect(()=>{if(typeof window==='undefined'||!['cases','clients'].includes(area))return;
  const cnj=new URLSearchParams(window.location.search).get('buscar');
  if(cnj){setType('numero');setSearch(cnj);setDraft(cnj);setPage(0)}
 },[area]);
 const [selected,setSelected]=useState(null),[history,setHistory]=useState([]),[attendNote,setAttendNote]=useState(''),[nextDate,setNextDate]=useState('');
 const [confirmed,setConfirmed]=useState(false),[consulted,setConsulted]=useState(null);
 const historyRequest=useRef(0);
 const [historyLoading,setHistoryLoading]=useState(false);
 const [officialHistory,setOfficialHistory]=useState([]),[historyErrors,setHistoryErrors]=useState([]);
 const [consultBusy,setConsultBusy]=useState(false),[consultRange,setConsultRange]=useState(recentPeriod);
 useEffect(()=>()=>{historyRequest.current++},[]);
 const closeAction=()=>{if(busy)return;historyRequest.current++;setSelected(null);setEditing(null);setConsulted(null);setHistory([]);setOfficialHistory([]);setHistoryErrors([]);setHistoryLoading(false);setConsultBusy(false)};
 const [period,setPeriod]=useState('mes'),[scope,setScope]=useState('empresa'),[attendance,setAttendance]=useState([]),[reportTotal,setReportTotal]=useState(0);
 const [reportBusy,setReportBusy]=useState(false),[teamStats,setTeamStats]=useState([]),[selectedMode,setSelectedMode]=useState('atendimento');
 useEffect(()=>{
  let live=true;
  (async()=>{
   try{
    const {data,error}=await db.from('usuarios').select('id,auth_user_id,empresa_id,nome,cargo,role').eq('auth_user_id',session.user.id).limit(2);
    if(error)throw Error(error.message);
    const current=resolveCompanyAccess(data||[],session.user.id);
    if(!current)throw Error('Conta sem vínculo único e autorizado com empresa do LexisPredict.');
    if(!live)return;
    setProfile(current);
    const [users,empresa]=await Promise.all([
      db.from('usuarios').select('id,auth_user_id,empresa_id,nome,cargo').eq('empresa_id',current.empresa_id).limit(200),
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
 const loadHistory=useCallback(async(row,request)=>{
  setHistory([]);setOfficialHistory([]);setHistoryErrors([]);setHistoryLoading(true);
  try{
   const result=await loadPortfolioHistory({db,companyId:profile.empresa_id,processId:row.id,number:normalizedCnj(row.process_number)});
   if(request===historyRequest.current){setHistory(result.activities);setOfficialHistory(result.officialItems);setHistoryErrors(result.errors)}
  }catch(e){if(request===historyRequest.current)setHistoryErrors(['Histórico não carregado: '+e.message])}
  finally{if(request===historyRequest.current)setHistoryLoading(false)}
 },[db,profile?.empresa_id]);
 const attend=useCallback(async(row)=>{
  if(!profile?.empresa_id)return;
  const request=++historyRequest.current;
  setEditing(null);setNotice('');
  setSelected(row);setSelectedMode('atendimento');setAttendNote('');setNextDate(row.next_attendance||'');setConfirmed(false);setConsulted(null);
  void loadHistory(row,request);
 },[profile?.empresa_id,loadHistory]);
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
   historyRequest.current++;setHistoryLoading(false);setHistory([]);
   setAttendNote('');setSelected(null);await load();
  }catch(e){setNotice('Atendimento não registrado: '+e.message)}
  finally{setBusy(false)}
 };
 const startEdit=(p,what)=>{historyRequest.current++;setSelected(null);setEditing(p);setMode(what);setForm(initialForm(p));setNotice('')};
 const saveEdit=async e=>{
  e.preventDefault();if(!editing||busy||!profile?.empresa_id)return;
  const fields=mode==='cliente'?FIELDS_CLIENT:FIELDS_PROCESS.filter(f=>f!=='protocolo_ref' && !(f==='status_interno'&&form.status_interno==='preservar'));
  let patch;try{patch=portfolioUpdate(Object.fromEntries(fields.map(f=>[f,form[f]])))}catch(err){setNotice(err.message);return}
  setBusy(true);setNotice('');
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
 const consult=async(p,options={})=>{
  if(!p.process_number||!normalizedCnj(p.process_number)){setNotice('Número CNJ incompleto. Consulta oficial não iniciada.');return}
  const request=++historyRequest.current;
  setEditing(null);setConsultRange(options.start||options.end?options:recentPeriod());
  setSelected(p);setSelectedMode('consulta');setConsulted(null);setConsultBusy(true);setNotice('Consultando as fontes oficiais...');
  void loadHistory(p,request);
  try{
   const {data:{session:s}}=await db.auth.getSession();
   if(!s?.access_token)throw Error('Sessão expirada.');
   const result=await consultHistoricalCase({
    number:normalizedCnj(p.process_number),source:options.source||'auto',start:options.start,end:options.end,page:options.page||1,
    onProgress:progress=>{if(request===historyRequest.current)setNotice('Consultando período '+progress.current+' de '+progress.total+'...')},
    fetchServer:async({number,source,start,end,page})=>{
     const qs=new URLSearchParams({numero:number,fonte:source,pagina:String(page),...(start?{inicio:start}:{}),...(end?{fim:end}:{})});
     const resp=await fetch('/api/processos/consulta?'+qs,{headers:{Authorization:'Bearer '+s.access_token},cache:'no-store'});
     const raw=await resp.text();
     let body;try{body=JSON.parse(raw)}catch{throw Error('O servidor de consulta não respondeu com dados válidos (HTTP '+resp.status+').')}
     if(!resp.ok&&body.ok!==false)throw Error(body.error||'Consulta indisponível (HTTP '+resp.status+').');
     return body;
    },
    fetchBrowser:async({number,start,end,page})=>browseOfficialDjenNumber({number,start,end,page})
   });
   if(request!==historyRequest.current)return;
   setConsulted(result);
   setNotice(result.notice||'Consulta terminada; confira quais fontes responderam.');
  }catch(e){if(request===historyRequest.current)setNotice('Consulta judicial não confirmada: '+e.message)}finally{if(request===historyRequest.current)setConsultBusy(false)}
 };
 // Atalho vindo de Prazos, Agenda ou Audiências: abre a ação REAL do processo autorizado.
 // Nunca resolve o vínculo por nome do cliente nem executa ações sem conferir empresa_id.
 useEffect(()=>{
  if(typeof window==='undefined'||!profile?.empresa_id||!['cases','clients'].includes(area))return;
  const params=new URLSearchParams(window.location.search);
  const id=String(params.get('processo')||'').trim(),action=params.get('acao');
  if(!/^[0-9a-z-]{1,64}$/i.test(id)||!['editar-cliente','editar-processo','atendimento','consulta'].includes(action))return;
  let alive=true;
  (async()=>{
   try{
    const {data,error}=await db.from('processos').select(PROCESS_FIELDS)
     .eq('empresa_id',profile.empresa_id).eq('id',id).maybeSingle();
    if(error||!data?.id)throw Error(error?.message||'Processo não localizado nesta organização.');
    if(!alive)return;
    const mapped=mapLexisProcess(data);
    setPage(0);setActiveFilter('todos');
    if(mapped.process_number){setType('numero');setSearch(mapped.process_number);setDraft(mapped.process_number)}
    if(action==='editar-cliente')startEdit(mapped,'cliente');
    if(action==='editar-processo')startEdit(mapped,'processo');
    if(action==='atendimento')await attend(mapped);
    if(action==='consulta')await consult(mapped);
   }catch(error){if(alive)setNotice('Não foi possível abrir os detalhes solicitados: '+String(error?.message||error))}
  })();
  return()=>{alive=false};
 },[db,profile?.empresa_id,area]);
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
 if(authChecking)return <main className="reference-auth lx-shared">Validando vínculo com a organização do LexisPredict...</main>;
 if(!profile)return <main className="reference-auth lx-shared" role="alert">Acesso bloqueado. {notice||'Usuário sem vínculo ativo com empresa do LexisPredict.'}</main>;
 if(area==='reports')return <main className="inf-studio lx-shared" data-lexis-shared="reports">
  <header className="reference-header"><div><div className="reference-overline">INFINITUM · RELATÓRIO EMPRESARIAL</div><h1>Relatórios</h1><p>{company} · todos os dados provêm do banco principal LexisPredict.</p></div>
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

 if(area==='deadlines'){
  const today=todayBrazil();
  const open=deadlineRows.filter(x=>x.status!=='concluido');
  const overdue=open.filter(x=>x.due_on&&x.due_on<today);
  const todayList=open.filter(x=>x.due_on===today);
  const weekEnd=(()=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10);})();
  const week=open.filter(x=>x.due_on&&x.due_on>=today&&x.due_on<=weekEnd);
  return <main className="reference-dashboard" data-lexis-shared="deadlines">
   <header className="reference-header"><div><div className="reference-overline">INFINITUM · BASE LEXISPREDICT</div><h1>Prazos e retornos</h1>
   <p>Retornos agendados a partir de <code>processos.proximo_retorno</code> da carteira Lexis. Não calcula prazo processual automático (CPC).</p></div>
   <div className="reference-actions"><button className="reference-outline" onClick={loadDeadlinesFromProcessos} disabled={calendarLoading}><RefreshCw size={16}/> Atualizar</button>
   <Link className="reference-outline" href="/agenda"><CalendarDays size={16}/> Agenda</Link>
   <Link className="reference-primary" href="/processos"><FileText size={16}/> Processos</Link></div></header>
   {notice&&<p className="inf-note" role="status">{notice}</p>}
   <div className="inf-grid">
    <Summary title="Com retorno cadastrado" count={open.length} href="/prazos"/>
    <Summary title="Vencidos" count={overdue.length} href="/prazos"/>
    <Summary title="Hoje" count={todayList.length} href="/prazos"/>
    <Summary title="Próximos 7 dias" count={week.length} href="/prazos"/>
   </div>
   <section className="inf-panel"><h2>Fila de retornos</h2>
    <p className="inf-note">Fonte: Supabase Lexis · tabela processos. Datas exigem conferência com intimação e expediente do tribunal.</p>
    {calendarLoading&&<p className="inf-note">Carregando retornos...</p>}
    <div className="office-records">{open.map(x=><article className="office-record" key={x.id}>
     <strong>{x.client_name||x.title}</strong>
     <small>{DATE_LABEL(x.due_on)} · {x.status==='vencido'?'Vencido':'Em aberto'} · {x.process_number||'Sem CNJ'} · {x.tribunal||'—'}</small>
     <p>{x.notes||'Retorno operacional cadastrado na carteira.'}</p>
     <div className="office-action-row"><Link className="inf-btn" href={"/processos"}>Abrir carteira</Link></div>
    </article>)}
    {!calendarLoading&&!open.length&&<div className="office-list-empty">Nenhum próximo retorno cadastrado nos processos desta empresa.</div>}
    </div>
   </section>
  </main>;
 }

 if(area==='audiencias'){
  const today=todayBrazil();
  const upcoming=hearingRows.filter(x=>!x.due_on||x.due_on>=today);
  return <main className="reference-dashboard" data-lexis-shared="audiencias">
   <header className="reference-header"><div><div className="reference-overline">INFINITUM · BASE LEXISPREDICT</div><h1>Audiências</h1>
   <p>Eventos oficiais monitorados (quando a tabela Lexis estiver disponível). Não inventa audiência a partir de retorno de carteira.</p></div>
   <div className="reference-actions"><button className="reference-outline" onClick={loadHearings} disabled={calendarLoading}><RefreshCw size={16}/> Atualizar</button>
   <Link className="reference-outline" href="/prazos"><CalendarDays size={16}/> Prazos</Link>
   <Link className="reference-primary" href="/processos"><Gavel size={16}/> Processos</Link></div></header>
   {notice&&<p className="inf-note" role="status">{notice}</p>}
   <div className="inf-grid">
    <Summary title="Registros carregados" count={hearingRows.length} href="/audiencias"/>
    <Summary title="A partir de hoje" count={upcoming.length} href="/audiencias"/>
    <Summary title="Com link/fonte" count={hearingRows.filter(x=>x.fonte_url).length} href="/audiencias"/>
    <Summary title="Membros da org." count={team.length} href="/relatorios"/>
   </div>
   <section className="inf-panel"><h2>Agenda de audiências</h2>
    <p className="inf-note">Conferência obrigatória no portal do tribunal. Situação e horário podem mudar sem aviso nesta tela.</p>
    {calendarLoading&&<p className="inf-note">Carregando audiências...</p>}
    <div className="office-records">{upcoming.map(x=><article className="office-record" key={x.id}>
     <strong>{x.client_name||x.title}</strong>
     <small>{DATE_LABEL(x.due_on)}{x.hora?' · '+x.hora:''} · {x.tipo||'Audiência'} · {x.process_number||'—'} · {x.tribunal||'—'}</small>
     <p>{x.notes||x.fonte||'Fonte oficial monitorada'}</p>
     {x.fonte_url&&<div className="office-action-row"><a className="inf-btn" href={x.fonte_url} target="_blank" rel="noopener noreferrer">Abrir fonte</a></div>}
    </article>)}
    {!calendarLoading&&!upcoming.length&&<div className="office-list-empty">Nenhuma audiência monitorada disponível. Se a tabela <code>audiencias_monitoradas</code> não existir neste projeto Supabase, habilite as migrations do Lexis ou cadastre retornos em Processos.</div>}
    </div>
   </section>
  </main>;
 }

 return <main className="inf-studio lx-shared" data-lexis-shared="portfolio">
  <header className="reference-header"><div><div className="reference-overline">INFINITUM · GESTÃO DA ORGANIZAÇÃO</div><h1>{area==='clients'?'Clientes':area==='cases'?'Processos':'Carteira da organização'}</h1>
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
   <div className="office-records">{rows.map(p=><article className="office-record lx-process-record" key={p.id}>
    <div className="inf-row-end" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{p.client_name||'Cliente não identificado'}</strong><p>{p.process_number||'Sem número CNJ'} · {p.tribunal||'Tribunal não informado'}</p>
     <small className="lx-process-meta"><span className={'lx-status lx-status--'+processStatus(p.status_detail).key}>{processStatus(p.status_detail).label}</span> <span className={'lx-status lx-status--'+classifyLexisReturn(p,todayBrazil()).status}>{classifyLexisReturn(p,todayBrazil()).label}</span> · Último atendimento: {DATE_LABEL(p.last_attendance)} · Próximo retorno: {DATE_LABEL(p.next_attendance)} · Próximo prazo: {DATE_LABEL(p.next_deadline)} · Responsável: <strong>{responsibleDisplay(p.last_responsible,team)}</strong></small></div>
    </div>
    <div className="inf-row-end lx-process-toolbar" style={{justifyContent:'flex-start',gap:6,flexWrap:'wrap'}}>
     <button type="button" className="inf-btn" aria-haspopup="dialog" onClick={()=>startEdit(p,'cliente')}><Edit3 size={14}/> Editar cliente</button>
     <button type="button" className="inf-btn" aria-haspopup="dialog" onClick={()=>startEdit(p,'processo')}><FileText size={14}/> Editar processo</button>
     <button type="button" className="inf-btn primary" aria-haspopup="dialog" onClick={()=>attend(p)}><ClipboardList size={14}/> Registrar atendimento</button>
     <button className="inf-btn" onClick={()=>consult(p)} disabled={busy||consultBusy||!normalizedCnj(p.process_number)}><Gavel size={14}/> Consultar</button>
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
  {editing&&<PortfolioDialog title={'Editar '+(mode==='cliente'?'cliente':'processo')} busy={busy} notice={notice} onClose={closeAction}>
   <p>{editing.client_name||'Cliente não identificado'} · {editing.process_number||'Sem número CNJ'}</p>
   <form onSubmit={saveEdit}><fieldset disabled={busy}><div className="inf-fields">
    {(mode==='cliente'?FIELDS_CLIENT:FIELDS_PROCESS.filter(f=>f!=='protocolo_ref')).map(field=>(
     <label key={field}>{({cliente:'Cliente',telefone:'Telefone',email:'E-mail',cpf:'CPF',tribunal:'Tribunal',advogado:'Advogado',observacoes:'Observações',proximo_retorno:'Próximo atendimento',proximo_prazo:'Próximo prazo',status_interno:'Situação interna'})[field]||field}
      {field==='status_interno'?<select value={form[field]||'ativo'} onChange={e=>setForm({...form,[field]:e.target.value})}>{form.status_interno==='preservar'&&<option value="preservar">Manter situação atual ({editing.status_detail||'Especial'})</option>}<option value="ativo">Ativo</option><option value="em_andamento">Em andamento</option><option value="suspenso">Suspenso</option><option value="encerrado">Encerrado</option><option value="excluido">Excluído (arquivado)</option></select>:
       field==='observacoes'?<textarea value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>:
       <input type={['proximo_retorno','proximo_prazo'].includes(field)?'date':field==='email'?'email':field==='telefone'?'tel':'text'} required={field==='cliente'} value={form[field]||''} onChange={e=>setForm({...form,[field]:e.target.value})}/>}</label>
    ))}
   </div></fieldset><div className="inf-row-end lx-dialog-actions"><button type="submit" className="inf-btn primary" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button><button type="button" className="inf-btn" disabled={busy} onClick={closeAction}>Cancelar</button></div></form>
  </PortfolioDialog>}
  {selected&&<PortfolioDialog title={selectedMode==='atendimento'?'Registrar atendimento':'Consulta oficial'} busy={busy} notice={notice} onClose={closeAction}>
   <p><strong>{selected.client_name||selected.process_number}</strong></p>
   <p>Último: {DATE_LABEL(selected.last_attendance)} · Próximo: {DATE_LABEL(selected.next_attendance)} · Responsável: <strong>{responsibleDisplay(selected.last_responsible,team)}</strong></p>
   {selectedMode==='consulta'&&<>
    <p><strong>CNJ: {selected.process_number}</strong></p>
    <p>DJEN: publicações de {DATE_LABEL(consultRange.start)} a {DATE_LABEL(consultRange.end)}. DataJud: movimentações disponíveis no índice público, inclusive anteriores a esse período.</p>
    <form className="lx-consult-range" onSubmit={e=>{e.preventDefault();consult(selected,consultRange)}}>
     <fieldset disabled={consultBusy}><div className="inf-fields">
      <label>DJEN desde<input type="date" required value={consultRange.start} max={consultRange.end} onChange={e=>setConsultRange({...consultRange,start:e.target.value})}/></label>
      <label>DJEN até<input type="date" required value={consultRange.end} min={consultRange.start} onChange={e=>setConsultRange({...consultRange,end:e.target.value})}/></label>
      <label>Fonte<select value={consultRange.source} onChange={e=>setConsultRange({...consultRange,source:e.target.value})}><option value="auto">DJEN + DataJud</option><option value="djen">DJEN</option><option value="datajud">DataJud</option></select></label>
      <label>Página DJEN<input type="number" min="1" max="100" required value={consultRange.page} onChange={e=>setConsultRange({...consultRange,page:Number(e.target.value)})}/></label>
     </div></fieldset><button type="submit" className="inf-btn primary" disabled={consultBusy}>{consultBusy?'Consultando...':'Consultar período'}</button>
    </form>
    {consulted&&<JudicialConsultationResult result={consulted}/>}
   </>}
   {selectedMode==='atendimento'&&<form onSubmit={saveAttendance}><fieldset disabled={busy}><div className="inf-fields">
    <label className="lx-field-wide">Resumo do atendimento realizado<textarea value={attendNote} onChange={e=>setAttendNote(e.target.value)} minLength={3} maxLength={3000} required/></label>
    <label>Próximo atendimento<input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)}/></label>
    <label className="lx-check-field"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Contato com o cliente confirmado</label>
   </div></fieldset><p className="inf-note">Responsável será registrado automaticamente com seu login Lexis: <b>{profile.nome}</b>. O histórico anterior não será sobrescrito.</p>
   <div className="inf-row-end lx-dialog-actions"><button type="submit" className="inf-btn primary" disabled={busy}>{busy?'Registrando...':'Confirmar atendimento'}</button><button className="inf-btn" type="button" disabled={busy} onClick={closeAction}>Fechar</button></div></form>}
   {historyLoading&&<p role="status">Carregando histórico...</p>}
   {historyErrors.map(error=><p className="lx-dialog-notice" role="status" key={error}>{error}</p>)}
   {!historyLoading&&<section className="lx-saved-history"><h3>Histórico de atendimentos e atividades ({history.length})</h3>
    {history.map(x=><article className="lx-judicial-event" key={x.id}><strong>{DATE_LABEL(x.data_realizacao)}</strong> · {team.find(p=>p.auth_user_id===x.responsavel_auth_user_id)?.nome||'Responsável registrado'} · {x.categoria}<p>{x.descricao}</p></article>)}
    {!history.length&&!historyErrors.length&&<p>Nenhum atendimento registrado para este processo.</p>}
   </section>}
   {!historyLoading&&officialHistory.length>0&&<JudicialEvents key={'saved-'+selected.id} items={officialHistory} title="Histórico judicial salvo (consultas anteriores)"/>}
   {selectedMode==='consulta'&&<div className="lx-dialog-actions"><button type="button" className="inf-btn" onClick={closeAction}>Fechar</button></div>}
  </PortfolioDialog>}
 </main>;
}
