'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertCircle,AlertTriangle,ArrowLeft,ArrowUpRight,BadgeCheck,CalendarDays,CheckCircle2,ChevronRight,ClipboardCheck,Clock3,FileClock,Filter,Flag,History,Inbox,ListChecks,Loader2,Pencil,Phone,Plus,RefreshCcw,Search,Send,ShieldCheck,UserRound,Users,X} from 'lucide-react';
import {getClient} from '../../lib/supabase-client';
import {ADMIN_EMAIL,signInWithPassword} from '../../lib/login.mjs';
import {ATTENDANCE_CHANNELS,ATTENDANCE_OUTCOMES,dueDate,filterTaskQueue,queueCounts,taskStatus,todayBrazil,validateAttendance,validISO} from '../../lib/tarefas.mjs';
import './tarefas.css';

const queueViews=[
 {id:'prioridades',label:'Prioridades',icon:ListChecks},
 {id:'vencidos',label:'Só vencidos',icon:AlertTriangle},
 {id:'hoje',label:'Vencem hoje',icon:CalendarDays},
 {id:'em_dia',label:'Em dia',icon:CheckCircle2},
 {id:'sem_data',label:'Sem data',icon:FileClock},
 {id:'finalizados',label:'Finalizados',icon:BadgeCheck},
 {id:'atendidos',label:'Atendidos hoje',icon:ClipboardCheck}
];
const channelOptions={whatsapp:'WhatsApp',ligacao:'Ligação',email:'E-mail',presencial:'Presencial',outro:'Outro'};
const outcomeOptions={contatado:'Contato realizado',sem_resposta:'Não respondeu',em_negociacao:'Em negociação',aguardando_resposta:'Aguardando resposta',outro:'Outro resultado'};
const prioOptions={normal:'Normal',alta:'Alta',urgente:'Urgente'};
const dateBR=d=>d&&validISO(d)?new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'}):'Não informado';
const timestampBR=d=>d?new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const nextAfter=(date,days=30)=>new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
const normalText=t=>String(t||'').trim();
function statusDescription(status){
 if(status.code==='vencido')return `${-status.days} ${-status.days===1?'dia':'dias'} em atraso`;
 if(status.code==='hoje')return 'Retorno previsto para hoje';
 if(status.code==='em_dia')return `Faltam ${status.days} ${status.days===1?'dia':'dias'}`;
 if(status.code==='finalizado')return 'Acompanhamento encerrado';
 return 'Definir data de retorno';
}
function TaskBadge({client,today}){
 const s=taskStatus(client,today);
 return <span className={'task-badge task-badge-'+s.code}>{s.code==='vencido'&&<AlertTriangle size={12}/>} {s.label}</span>;
}
function InfoLine({label,children}){return <div className="task-info-line"><span>{label}</span><strong>{children||'—'}</strong></div>}
function TaskLogin({db,onLogged}){
 const [password,setPassword]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 async function login(e){
  e.preventDefault();setLoading(true);setError('');
  try{const {session}=await signInWithPassword(db.auth,password);setPassword('');onLogged(session)}
  catch(err){setError(err.message||'Não foi possível entrar.')}
  finally{setLoading(false)}
 }
 return <main className="task-auth-wrap"><div className="task-auth">
   <div className="task-logo">W<span>1</span>SC <small>CRM</small></div>
   <div className="task-kicker">ACESSO RESTRITO</div>
   <h1>Central de tarefas</h1>
   <p>Entre para visualizar os vencidos, organizar prioridades e registrar atendimentos.</p>
   <form onSubmit={login} className="task-auth-form">
    <label>E-mail<input readOnly type="email" value={ADMIN_EMAIL}/></label>
    <label>Senha<input required minLength={8} type={show?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha do CRM"/></label>
    <label className="task-check"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Mostrar senha</label>
    <button className="task-button task-button-primary" disabled={loading}>{loading?<Loader2 size={17} className="task-spin"/>:<ShieldCheck size={17}/>} Entrar nas tarefas</button>
    {error&&<p className="task-error" role="alert">{error}</p>}
   </form><a href="/" className="task-auth-back"><ArrowLeft size={15}/> Voltar ao CRM e recuperar senha</a>
 </div></main>;
}
export default function TarefasPage(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true);
 const [clients,setClients]=useState([]),[loading,setLoading]=useState(false),[notice,setNotice]=useState('');
 const [view,setView]=useState('prioridades'),[search,setSearch]=useState(''),[priorityFilter,setPriorityFilter]=useState('todos'),[institutionFilter,setInstitutionFilter]=useState('todos');
 const [selected,setSelected]=useState(null),[modal,setModal]=useState(null);
 const [edit,setEdit]=useState({}),[reason,setReason]=useState('');
 const [attendance,setAttendance]=useState({channel:'whatsapp',outcome:'contatado',body:'',next_due:'',responsible:'Davi Alves Figueredo'});
 const [history,setHistory]=useState([]),[historyLoading,setHistoryLoading]=useState(false),[saving,setSaving]=useState(false);
 const today=todayBrazil();
 useEffect(()=>{
  if(!db){setAuthLoading(false);return;}
  let mounted=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,s)=>{
    if(mounted){setSession(s);setAuthLoading(false)}
  });
  db.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setAuthLoading(false)}}).catch(()=>{
    if(mounted)setAuthLoading(false);
  });
  const fromUrl=new URLSearchParams(window.location.search).get('fila');
  if(queueViews.some(x=>x.id===fromUrl))setView(fromUrl);
  return()=>{mounted=false;subscription.unsubscribe()};
 },[db]);
 const load=useCallback(async()=>{
  if(!db)return;
  setLoading(true);
  const {data,error}=await db.from('crm_clients').select('*').order('name',{ascending:true}).limit(1000);
  if(error)setNotice('Não foi possível carregar a fila: '+error.message);
  else{setClients(data||[]);setNotice('')}
  setLoading(false);
 },[db]);
 useEffect(()=>{if(session?.user?.email?.toLowerCase()===ADMIN_EMAIL)load();else setClients([])},[session?.user?.id,load]);
 const counts=useMemo(()=>queueCounts(clients,today),[clients,today]);
 const institutionOptions=useMemo(()=>[...new Set(clients.map(c=>normalText(c.institution)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')),[clients]);
 const queue=useMemo(()=>filterTaskQueue(clients,{view,today,query:search,priority:priorityFilter,institution:institutionFilter}),[clients,view,today,search,priorityFilter,institutionFilter]);
 function go(newView){
  setView(newView);setSearch('');setPriorityFilter('todos');setInstitutionFilter('todos');
  const url=new URL(window.location.href);
  if(newView==='prioridades')url.searchParams.delete('fila');else url.searchParams.set('fila',newView);
  window.history.replaceState(null,'',url.pathname+url.search);
 }
 function startEdit(client,forceFinish){
  setSelected(client);setReason('');
  setEdit({
   name:client.name||'',phone:client.phone||'',consultant:client.consultant||'',institution:client.institution||'',
   contacted_party:client.contacted_party||'',assigned_to:client.assigned_to||'',priority_level:client.priority_level||'normal',
   due_override:dueDate(client)||'',notes:client.notes||'',workflow_status:forceFinish===undefined?(client.workflow_status||'ativo'):forceFinish?'finalizado':'ativo'
  });
  setModal('edit');
 }
 function startAttendance(client){
  setSelected(client);
  setAttendance({channel:'whatsapp',outcome:'contatado',body:'',next_due:nextAfter(today,30),responsible:client.assigned_to||'Davi Alves Figueredo'});
  setModal('attendance');
 }
 async function startHistory(client){
  setSelected(client);setModal('history');setHistory([]);setHistoryLoading(true);
  const {data,error}=await db.from('crm_activities').select('id,kind,body,details,created_at').eq('client_id',client.id).order('created_at',{ascending:false}).limit(100);
  if(error)setNotice('Não foi possível carregar histórico: '+error.message);
  else setHistory(data||[]);
  setHistoryLoading(false);
 }
 function closeModal(){if(!saving){setModal(null);setSelected(null)}}
 async function saveEdit(e){
  e.preventDefault();if(!selected||saving)return;
  if(normalText(edit.name).length<3){setNotice('Preencha o nome do cliente.');return;}
  if(edit.due_override&&!validISO(edit.due_override)){setNotice('Informe uma data de retorno válida.');return;}
  if(edit.workflow_status!==selected.workflow_status&&normalText(reason).length<3){
   setNotice('Informe o motivo para finalizar ou reabrir o cliente.');return;
  }
  setSaving(true);setNotice('');
  const patch={...edit,name:normalText(edit.name),due_override:edit.due_override||null};
  const {error}=await db.rpc('crm_update_client',{p_client_id:selected.id,p_patch:patch,p_reason:reason});
  if(error){setNotice('Não foi possível salvar: '+error.message);setSaving(false);return;}
  setModal(null);setSelected(null);
  await load();setNotice('Cliente atualizado e alteração registrada no histórico.');setSaving(false);
 }
 async function saveAttendance(e){
  e.preventDefault();if(!selected||saving)return;
  let payload;
  try{payload=validateAttendance(attendance)}
  catch(err){setNotice(err.message);return;}
  setSaving(true);setNotice('');
  const {error}=await db.rpc('crm_register_attendance',{
   p_client_id:selected.id,p_body:payload.body,p_channel:payload.channel,
   p_outcome:payload.outcome,p_next_due:payload.next_due,
   p_responsible:normalText(attendance.responsible)||null
  });
  if(error){setNotice('Atendimento não registrado: '+error.message);setSaving(false);return;}
  setModal(null);setSelected(null);
  await load();setNotice('Atendimento registrado e próximo retorno atualizado.');setSaving(false);
 }
 if(!db)return <div className="task-auth-wrap"><div className="task-auth"><h1>CRM em configuração</h1><p>Configure a conexão Supabase antes de acessar dados privados.</p></div></div>;
 if(authLoading)return <div className="task-auth-wrap"><div className="task-loading"><Loader2 className="task-spin" size={24}/> Carregando acesso seguro...</div></div>;
 if(!session)return <TaskLogin db={db} onLogged={setSession}/>;
 if(session?.user?.email?.toLowerCase()!==ADMIN_EMAIL)return <div className="task-auth-wrap"><div className="task-auth"><h1>Acesso não autorizado</h1><p>Esta conta não tem acesso à carteira da ProjectW1SC.</p><button className="task-button" onClick={()=>db.auth.signOut()}>Sair</button></div></div>;
 const selectedStatus=selected?taskStatus(selected,today):null;
 return <div className="task-shell">
  <aside className="task-sidebar">
   <div className="task-brand">PROJECT<span>W1SC</span><small>CONTROLE DE NEGOCIAÇÕES</small></div>
   <div className="task-side-group">ÁREA DE TRABALHO</div>
   <a className="task-side-item" href="/"><Users size={17}/> Visão geral do CRM</a>
   {queueViews.map(item=>{const Icon=item.icon;return <button key={item.id} className={'task-side-item '+(view===item.id?'task-side-active':'')} onClick={()=>go(item.id)}><Icon size={17}/>{item.label}{item.id==='vencidos'&&counts.vencido>0&&<span className="task-side-count">{counts.vencido}</span>}</button>})}
   <div className="task-side-foot"><div><span className="task-online-dot"/> Dados do Supabase</div><small>{session.user.email}</small><button onClick={()=>db.auth.signOut()}>Sair da conta <ArrowUpRight size={14}/></button></div>
  </aside>
  <main className="task-main">
   <header className="task-header">
    <div><div className="task-kicker">PROJECTW1SC <span>/ FILA OPERACIONAL</span></div><h1>Fila de prioridades</h1><p>Atenda primeiro os retornos vencidos. Edite, registre o contato e agende o próximo retorno.</p></div>
    <button className="task-button task-button-outline" disabled={loading||saving} onClick={load}><RefreshCcw size={16} className={loading?'task-spin':''}/> Atualizar</button>
   </header>
   <div className="task-metrics">
    <button onClick={()=>go('vencidos')} className={'task-metric '+(view==='vencidos'?'selected':'')}>
      <span className="task-metric-icon danger"><AlertTriangle size={18}/></span><div><small>Vencidos</small><strong>{counts.vencido}</strong><em>Precisam de atenção</em></div>
    </button>
    <button onClick={()=>go('hoje')} className={'task-metric '+(view==='hoje'?'selected':'')}>
      <span className="task-metric-icon amber"><CalendarDays size={18}/></span><div><small>Vencem hoje</small><strong>{counts.hoje}</strong><em>Retornos do dia</em></div>
    </button>
    <button onClick={()=>go('em_dia')} className={'task-metric '+(view==='em_dia'?'selected':'')}>
      <span className="task-metric-icon mint"><CheckCircle2 size={18}/></span><div><small>Em dia</small><strong>{counts.em_dia}</strong><em>Próximos retornos</em></div>
    </button>
    <button onClick={()=>go('sem_data')} className={'task-metric '+(view==='sem_data'?'selected':'')}>
      <span className="task-metric-icon slate"><FileClock size={18}/></span><div><small>Sem data</small><strong>{counts.sem_data}</strong><em>Definir retorno</em></div>
    </button>
    <button onClick={()=>go('finalizados')} className={'task-metric '+(view==='finalizados'?'selected':'')}>
      <span className="task-metric-icon plum"><BadgeCheck size={18}/></span><div><small>Finalizados</small><strong>{counts.finalizado}</strong><em>Fora da fila ativa</em></div>
    </button>
   </div>
   {notice&&<div className="task-notice" role="status"><AlertCircle size={16}/>{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}><X size={15}/></button></div>}
   <section className="task-board">
    <div className="task-board-head">
     <div><span className="task-kicker">ROTINA DE ATENDIMENTO</span><h2>{queueViews.find(x=>x.id===view)?.label||'Prioridades'} <span>({queue.length})</span></h2>
      <p>{view==='vencidos'?'Somente clientes com data de retorno anterior a hoje.':view==='finalizados'?'Clientes encerrados manualmente. Você pode reabrir cada acompanhamento.':view==='sem_data'?'Cadastros que precisam de data de retorno; não presumimos atraso sem data.':'Ordem automática: vencimentos, urgência e prioridade indicada.'}</p>
     </div>
     <div className="task-board-right"><span className="task-day-marker"><Clock3 size={15}/> {dateBR(today)}</span></div>
    </div>
    <div className="task-toolbar">
     <label className="task-search"><Search size={17}/><input placeholder="Buscar cliente, financeira, telefone ou responsável" value={search} onChange={e=>setSearch(e.target.value)}/></label>
     <label className="task-select-wrap"><Filter size={15}/><select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} aria-label="Filtrar prioridade"><option value="todos">Todas prioridades</option><option value="urgente">Urgente</option><option value="alta">Alta</option><option value="normal">Normal</option></select></label>
     <select className="task-select-institution" aria-label="Filtrar financeira" value={institutionFilter} onChange={e=>setInstitutionFilter(e.target.value)}><option value="todos">Todas as financeiras</option>{institutionOptions.map(x=><option key={x} value={x}>{x}</option>)}</select>
    </div>
    <div className="task-queue-tabs" role="tablist" aria-label="Filas de acompanhamento">
     {queueViews.map(item=><button role="tab" aria-selected={view===item.id} key={item.id} onClick={()=>go(item.id)} className={view===item.id?'active':''}>{item.label}{['vencidos','hoje','finalizados'].includes(item.id)&&<span>{counts[item.id==='vencidos'?'vencido':item.id==='finalizados'?'finalizado':'hoje']}</span>}</button>)}
    </div>
    {loading?<div className="task-empty"><Loader2 className="task-spin" size={25}/> Carregando a carteira...</div>:
      queue.length===0?<div className="task-empty"><Inbox size={35}/><strong>Nenhum cliente nesta fila</strong><p>Altere os filtros ou consulte a fila de prioridades.</p><button onClick={()=>go('prioridades')} className="task-button task-button-outline">Ver todas as prioridades</button></div>:
      <div className="task-list">{queue.map((client,index)=>{
       const s=taskStatus(client,today),isFinal=s.code==='finalizado';
       return <article key={client.id} className={'task-item '+(s.code==='vencido'?'task-overdue':'')}>
        <div className="task-item-rank">{index+1}</div>
        <div className="task-item-main">
         <div className="task-name-row"><strong>{client.name}</strong><TaskBadge client={client} today={today}/>{client.priority_level&&client.priority_level!=='normal'&&<span className={'task-priority task-priority-'+client.priority_level}><Flag size={12}/> {prioOptions[client.priority_level]||client.priority_level}</span>}{client.source_conflict&&<span className="task-source-warning" title="Divergência entre fontes">Revisar origem</span>}</div>
         <div className="task-item-description"><span>{client.institution||'Financeira não cadastrada'}</span><span className="task-dot"/> <span>{client.contacted_party?'Contato: '+client.contacted_party:'Sem escritório contatado informado'}</span></div>
         <div className="task-item-meta"><span><CalendarDays size={14}/> Próximo: <strong>{dateBR(s.date)}</strong></span><span><Clock3 size={14}/> {statusDescription(s)}</span>{client.phone&&<span><Phone size={13}/> {client.phone}</span>}{client.last_attendance_at&&<span><ClipboardCheck size={14}/> Último atendimento: {timestampBR(client.last_attendance_at)}</span>}</div>
         {s.code==='sem_data'&&client.source_status==='vencido'&&<p className="task-source-note">A planilha marcou como vencido, mas falta uma data válida. Confirme o retorno antes de agir.</p>}
        </div>
        <div className="task-item-actions">
         {!isFinal&&<button className="task-button task-button-primary" onClick={()=>startAttendance(client)}><Plus size={15}/> Registrar atendimento</button>}
         <button className="task-button task-button-subtle" onClick={()=>startEdit(client)}><Pencil size={15}/> Editar</button>
         <button className="task-icon-button" title="Ver histórico" aria-label={'Ver histórico de '+client.name} onClick={()=>startHistory(client)}><History size={18}/></button>
         {isFinal?<button className="task-link-mini" onClick={()=>startEdit(client,false)}>Reabrir</button>:<button className="task-link-mini" onClick={()=>startEdit(client,true)}>Finalizar</button>}
        </div>
       </article>;
      })}</div>}
    <div className="task-list-footer"><ShieldCheck size={15}/> Nenhuma mensagem é enviada automaticamente. Todos os registros ficam no Supabase.</div>
   </section>
  </main>
  {modal&&selected&&<div className="task-modal-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)closeModal()}}>
   <section className="task-modal" role="dialog" aria-modal="true" aria-label={modal==='attendance'?'Registrar atendimento':modal==='edit'?'Editar cliente':'Histórico do cliente'}>
    <div className="task-modal-header"><div><span className="task-kicker">CLIENTE / {selected.name}</span><h2>{modal==='attendance'?'Registrar atendimento':modal==='edit'?'Editar cadastro e prioridade':'Histórico de atendimentos'}</h2></div><button className="task-close" disabled={saving} onClick={closeModal} aria-label="Fechar"><X size={20}/></button></div>
    {modal==='attendance'&&<form onSubmit={saveAttendance} className="task-modal-body">
      <div className="task-context"><div><span>Situação atual</span><TaskBadge client={selected} today={today}/></div><div><span>Próximo retorno</span><strong>{dateBR(selectedStatus?.date)}</strong></div></div>
      <div className="task-form-grid">
       <label>Canal do atendimento<select value={attendance.channel} onChange={e=>setAttendance({...attendance,channel:e.target.value})}>{ATTENDANCE_CHANNELS.map(x=><option key={x} value={x}>{channelOptions[x]}</option>)}</select></label>
       <label>Resultado<select value={attendance.outcome} onChange={e=>setAttendance({...attendance,outcome:e.target.value})}>{ATTENDANCE_OUTCOMES.map(x=><option key={x} value={x}>{outcomeOptions[x]}</option>)}</select></label>
      </div>
      <label>O que foi conversado ou tentado? <span className="task-required">*</span><textarea required minLength={5} maxLength={4000} rows={4} placeholder="Ex.: Contato pelo WhatsApp, cliente informou que aguarda resposta da financeira..." value={attendance.body} onChange={e=>setAttendance({...attendance,body:e.target.value})}/></label>
      <div className="task-form-grid">
       <label>Próximo retorno<input type="date" value={attendance.next_due} onChange={e=>setAttendance({...attendance,next_due:e.target.value})}/><small>30 dias é apenas uma sugestão; altere conforme o combinado.</small></label>
       <label>Responsável<input value={attendance.responsible} maxLength={150} onChange={e=>setAttendance({...attendance,responsible:e.target.value})}/></label>
      </div>
      <div className="task-form-hint"><CalendarDays size={16}/><button type="button" onClick={()=>setAttendance({...attendance,next_due:nextAfter(today,30)})}>Agendar em 30 dias</button><span>O agendamento é confirmado ao salvar.</span></div>
      <div className="task-modal-actions"><button type="button" className="task-button task-button-outline" onClick={closeModal} disabled={saving}>Cancelar</button><button className="task-button task-button-primary" disabled={saving}>{saving?<Loader2 size={16} className="task-spin"/>:<CheckCircle2 size={16}/>} Salvar atendimento</button></div>
    </form>}
    {modal==='edit'&&<form onSubmit={saveEdit} className="task-modal-body">
      <div className="task-form-grid">
       <label>Nome do cliente <span className="task-required">*</span><input required minLength={3} maxLength={250} value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></label>
       <label>Telefone<input value={edit.phone} maxLength={100} onChange={e=>setEdit({...edit,phone:e.target.value})}/></label>
       <label>Financeira<input value={edit.institution} maxLength={180} onChange={e=>setEdit({...edit,institution:e.target.value})}/></label>
       <label>Escritório / financeira contatado(a)<input value={edit.contacted_party} maxLength={180} onChange={e=>setEdit({...edit,contacted_party:e.target.value})}/></label>
       <label>Consultor<input value={edit.consultant} maxLength={150} onChange={e=>setEdit({...edit,consultant:e.target.value})}/></label>
       <label>Responsável<input value={edit.assigned_to} maxLength={150} onChange={e=>setEdit({...edit,assigned_to:e.target.value})}/></label>
       <label>Prioridade<select value={edit.priority_level} onChange={e=>setEdit({...edit,priority_level:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
       <label>Próximo retorno<input type="date" value={edit.due_override||''} onChange={e=>setEdit({...edit,due_override:e.target.value})}/><small>Altera a fila sem apagar a data de origem.</small></label>
       <label>Situação do acompanhamento<select value={edit.workflow_status} onChange={e=>setEdit({...edit,workflow_status:e.target.value})}><option value="ativo">Ativo</option><option value="finalizado">Finalizado</option></select></label>
      </div>
      <label>Observações internas<textarea rows={3} maxLength={5000} value={edit.notes||''} onChange={e=>setEdit({...edit,notes:e.target.value})}/></label>
      <label>{edit.workflow_status!==selected.workflow_status?'Motivo da finalização ou reabertura *':'Motivo da edição (opcional)'}<textarea rows={2} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Registre o motivo para manter um histórico claro" required={edit.workflow_status!==selected.workflow_status}/></label>
      {edit.workflow_status==='finalizado'&&<p className="task-warning"><AlertCircle size={16}/> Finalizar o acompanhamento tira o cliente da fila ativa, mas não significa que a quitação foi comprovada.</p>}
      <div className="task-modal-actions"><button type="button" className="task-button task-button-outline" onClick={closeModal} disabled={saving}>Cancelar</button><button className="task-button task-button-primary" disabled={saving}>{saving?<Loader2 size={16} className="task-spin"/>:<CheckCircle2 size={16}/>} Salvar alterações</button></div>
    </form>}
    {modal==='history'&&<div className="task-modal-body">
     <div className="task-context"><div><span>Cliente</span><strong>{selected.name}</strong></div><div><span>Último atendimento</span><strong>{timestampBR(selected.last_attendance_at)}</strong></div></div>
     {historyLoading?<div className="task-empty"><Loader2 className="task-spin"/> Carregando histórico...</div>:history.length===0?<div className="task-empty"><History size={30}/><strong>Nenhum atendimento registrado ainda.</strong></div>:
     <ol className="task-history">{history.map(event=><li key={event.id}><div className="task-history-point"/><div><div className="task-history-line"><strong>{event.kind==='atendimento'?'Atendimento':event.kind==='situacao'?'Mudança de situação':'Edição / registro'}</strong><time>{timestampBR(event.created_at)}</time></div><p>{event.body}</p>{event.details?.canal&&<div className="task-history-meta">{channelOptions[event.details.canal]||event.details.canal} · {outcomeOptions[event.details.resultado]||event.details.resultado}{event.details.proximo_retorno?' · Próximo: '+dateBR(event.details.proximo_retorno):''}</div>}</div></li>)}</ol>}
     <div className="task-modal-actions"><button className="task-button task-button-outline" onClick={closeModal}>Fechar</button>{selected.workflow_status!=='finalizado'&&<button className="task-button task-button-primary" onClick={()=>startAttendance(selected)}><Plus size={15}/> Novo atendimento</button>}</div>
    </div>}
   </section>
  </div>}
 </div>;
}
