'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,CalendarDays,CheckCircle2,Clock3,Download,FileClock,History,Loader2,Play,Plus,RefreshCw,Search,Square,UserRound,Users,ShieldCheck,FileText,Pencil,Trash2} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import ProfessionalAuth from '../../components/professional-auth';
import EfferdKpi from '../../components/efferd-kpi';
import {getClient} from '../../lib/supabase-client';
import {useCrmAccess} from '../../lib/use-crm-access';
import {ADMIN_EMAIL,signInWithPassword} from '../../lib/login.mjs';
import {todayBrazil} from '../../lib/tarefas.mjs';
import {ACTIVITY_CATEGORIES,PROCESS_TYPES,processTypeLabel,categoryLabel,validateCompletedActivity,toActivityUpdate,activitySummary,paginateActivities,toCsvCell} from '../../lib/minhas-atividades.mjs';
const TIMER_KEY='projectw1sc_activity_timer_v1';
const labels=Object.fromEntries(ACTIVITY_CATEGORIES.map(a=>[a.value,a.label]));
const brDate=x=>x?new Date(x+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
const clock=n=>[Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');
function EntryCard({item,client,onEdit,onDelete,busy}){
 return <article className="reference-activity-card">
  <div className="reference-row-between">
   <span className="reference-tag"><CalendarDays size={14}/> {brDate(item.performed_on)} · {categoryLabel(item.category)}</span>
   {item.contact_confirmed&&<span className="reference-status good"><CheckCircle2 size={13}/> Contato confirmado</span>}
  </div>
  <h3>{item.title}</h3>
  {item.description&&<p>{item.description}</p>}
  {item.process_number&&<div className="reference-process-row"><FileText size={15}/><span><strong>Processo:</strong> {item.process_number}</span><span className="reference-status neutral">{processTypeLabel(item.process_type)}</span><a href={'/processos?numero='+encodeURIComponent(item.process_number)} className="reference-outline" style={{minHeight:28,padding:'5px 8px'}}>Consultar DataJud / DJEN</a></div>}
  <div className="reference-related">
    <span className="reference-overline">VÍNCULO COM O CLIENTE</span>
    {client?<div className="reference-related-grid"><span><b>Cliente</b>{client.name}</span><span><b>Financeira</b>{client.institution||'Não cadastrada'}</span><span><b>Contato realizado</b>{client.contacted_party||'Não informado'}</span><span><b>Situação</b>{client.workflow_status==='finalizado'?'Finalizado':'Ativo'}</span></div>:<p>Atividade sem cliente vinculado. Nenhuma associação presumida.</p>}
  </div>
  <div className="reference-entry-footer"><span><Clock3 size={13}/> {Number(item.duration_seconds)>0?clock(item.duration_seconds)+' registrados':'Sem horas vinculadas'}</span><span>Registro: {new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}{item.updated_at&&new Date(item.updated_at).getTime()>new Date(item.created_at).getTime()+1000?' · Editado':''}</span></div>
  <div className="reference-activity-actions"><button type="button" onClick={()=>onEdit(item)} disabled={busy} aria-label={'Editar '+item.title}><Pencil size={14}/> Editar</button><button type="button" className="danger" onClick={()=>onDelete(item)} disabled={busy} aria-label={'Excluir '+item.title}><Trash2 size={14}/> Excluir</button></div>
 </article>;
}
export default function MinhasAtividades(){
 const db=useMemo(()=>getClient(),[]);
 const [loginEmail,setLoginEmail]=useState(ADMIN_EMAIL);
 const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[password,setPassword]=useState('');
 const access=useCrmAccess(db,session?.user);
 const [records,setRecords]=useState([]),[clients,setClients]=useState([]),[search,setSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState('todos'),[page,setPage]=useState(1);
 const [form,setForm]=useState({title:'',description:'',category:'atendimento',date:'',clientId:'',contactConfirmed:false,minutes:'0',processNumber:'',processType:''});
 const [editingId,setEditingId]=useState(null);
 const [timerStart,setTimerStart]=useState(null),[tick,setTick]=useState(0),[showTimer,setShowTimer]=useState(false);
 const today=todayBrazil();
 useEffect(()=>{
  if(!db){setChecking(false);return}
  let active=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(active){setSession(s);setChecking(false)}});
  db.auth.getSession().then(({data})=>{if(active){setSession(data.session);setChecking(false)}}).catch(()=>setChecking(false));
  return()=>{active=false;subscription.unsubscribe()}
 },[db]);
 useEffect(()=>{
  setForm(f=>({...f,date:today}));
  const stored=Number(window.localStorage.getItem(TIMER_KEY)||0);
  if(stored>0&&stored<=Date.now()&&Date.now()-stored<86400000)setTimerStart(stored);
 },[today]);
 useEffect(()=>{
  if(timerStart===null)return;
  const id=setInterval(()=>setTick(v=>v+1),1000);
  return()=>clearInterval(id);
 },[timerStart]);
 const elapsed=timerStart===null?0:Math.max(0,Math.floor((Date.now()-timerStart)/1000));
 const load=useCallback(async()=>{
  if(!db||!session?.user?.id)return;
  setBusy(true);
  const [a,b]=await Promise.all([
   db.from('crm_completed_activities').select('*').eq('actor_id',session.user.id).is('deleted_at',null).order('performed_on',{ascending:false}).order('created_at',{ascending:false}).limit(1000),
   db.from('crm_clients').select('id,name,institution,contacted_party,workflow_status').order('name').limit(1000)
  ]);
  if(a.error)setNotice('Erro ao carregar atividades: '+a.error.message);else{setRecords(a.data||[]);setNotice('')}
  if(b.error)setNotice('Erro ao carregar vínculos de clientes: '+b.error.message);else setClients(b.data||[]);
  setBusy(false);
 },[db,session?.user?.id]);
 useEffect(()=>{if(session?.user?.id)load();else{setRecords([]);setClients([])}},[session?.user?.id,load]);
 const byId=useMemo(()=>new Map(clients.map(x=>[x.id,x])),[clients]);
 const summary=useMemo(()=>activitySummary(records,session?.user?.id),[records,session?.user?.id]);
 const filtered=useMemo(()=>records.filter(r=>{
  if(categoryFilter!=='todos'&&r.category!==categoryFilter)return false;
  const q=search.toLocaleLowerCase('pt-BR').trim();
  return !q||[r.title,r.description,r.process_number,r.process_type,byId.get(r.client_id)?.name,r.category].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(q))
 }),[records,categoryFilter,search,byId]);
 const history=useMemo(()=>paginateActivities(filtered,page,12),[filtered,page]);
 function emptyForm(){return {title:'',description:'',category:'atendimento',date:today,clientId:'',contactConfirmed:false,minutes:'0',processNumber:'',processType:''}}
 function cancelEdit(){setEditingId(null);setForm(emptyForm());setNotice('')}
 function beginEdit(item){
  if(busy)return;
  setEditingId(item.id);setNotice('');
  setForm({title:item.title||'',description:item.description||'',category:item.category||'outro',date:item.performed_on||today,clientId:item.client_id||'',contactConfirmed:!!item.contact_confirmed,minutes:String(Number(item.duration_seconds||0)/60),processNumber:item.process_number||'',processType:item.process_type||''});
  document.getElementById('activity-form-heading')?.scrollIntoView({behavior:'auto',block:'start'});
 }
 async function deleteActivity(item){
  if(busy||!session?.user?.id)return;
  if(!window.confirm('Excluir a atividade "'+item.title+'"? Ela sairá do histórico visível e dos relatórios, mas permanecerá preservada no banco.'))return;
  setBusy(true);setNotice('');
  const {data,error}=await db.from('crm_completed_activities')
   .update({deleted_at:new Date().toISOString()})
   .eq('id',item.id).eq('actor_id',session.user.id).is('deleted_at',null).select('id');
  if(error||!data?.length){setNotice(error?'Não foi possível excluir: '+error.message:'Atividade não encontrada ou sem permissão para excluir.');setBusy(false);return}
  if(editingId===item.id){setEditingId(null);setForm(emptyForm())}
  setPage(1);await load();setNotice('Atividade excluída da lista. O registro original foi preservado para auditoria.');setBusy(false);
 }
  function editForm(key,v){setForm(f=>({...f,[key]:v}))}
 function stopTimer(){setTimerStart(null);window.localStorage.removeItem(TIMER_KEY)}
 function startTimer(){const at=Date.now();setTimerStart(at);window.localStorage.setItem(TIMER_KEY,String(at))}
 async function save(e){
  e.preventDefault();if(busy)return;
  let activity;
  try{activity=validateCompletedActivity({...form,date:form.date||today,clientId:form.clientId||null,durationSeconds:editingId?Math.round(Number(form.minutes||0)*60):timerStart!==null?elapsed:Math.round(Number(form.minutes||0)*60)},today)}
  catch(err){setNotice(err.message);return}
  setBusy(true);setNotice('');
  let error=null,updated=[];
  if(editingId){
   const result=await db.from('crm_completed_activities').update(toActivityUpdate({...form,date:form.date||today,clientId:form.clientId||null,durationSeconds:Math.round(Number(form.minutes||0)*60)},today))
      .eq('id',editingId).eq('actor_id',session.user.id).is('deleted_at',null).select('id');
   error=result.error;updated=result.data||[];
   if(!error&&!updated.length)error=new Error('Registro não encontrado ou sem permissão para editar.');
  }else{
   const result=await db.from('crm_completed_activities').insert({...activity,actor_id:session.user.id});
   error=result.error;
  }
  if(error){setNotice('Não foi possível registrar atividade: '+error.message);setBusy(false);return}
  if(timerStart!==null&&!editingId)stopTimer();
  const hadEdit=!!editingId;
  setEditingId(null);setForm(emptyForm());
  setPage(1);setCategoryFilter('todos');
  await load();setNotice(hadEdit?'Atividade atualizada com sucesso.':'Atividade concluída registrada no seu histórico privado.');setBusy(false);
 }
 function exportCsv(){
  const rows=[['Data','Categoria','Título','Descrição','Cliente','Número do processo','Tipo do processo','Contato confirmado','Duração (minutos)'],...filtered.map(x=>[
   x.performed_on,labels[x.category]||x.category,x.title,x.description||'',byId.get(x.client_id)?.name||'',x.process_number||'',x.process_type?processTypeLabel(x.process_type):'',
   x.contact_confirmed?'Sim':'Não',Math.round(Number(x.duration_seconds||0)/60)
  ])];
  const csv='\uFEFF'+rows.map(row=>row.map(toCsvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='projectw1sc-minhas-atividades.csv';a.click();
  URL.revokeObjectURL(url);
 }
 if(!db)return <main className="reference-auth"><h1>CRM em configuração</h1><p>Configuração de acesso não encontrada.</p></main>;
 if(checking)return <main className="reference-auth"><Loader2 size={24} className="task-spin"/> Verificando acesso...</main>;
 if(!session)return <ProfessionalAuth eyebrow="REGISTRO DE ATIVIDADES" title="Minhas atividades" description="Acesse seus registros, acompanhe o trabalho realizado e organize seu histórico.">
  <form className="w1-auth-form" onSubmit={async e=>{
   e.preventDefault();setBusy(true);setNotice('');
   try{const {session:s}=await signInWithPassword(db.auth,password,loginEmail);setSession(s)}
   catch(err){setNotice(err.message)}
   finally{setBusy(false)}
  }}>
   <label className="w1-auth-label" htmlFor="activities-user">Conta autorizada</label><input id="activities-user" type="email" required autoComplete="username" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
   <label className="w1-auth-label" htmlFor="activities-pass">Senha de acesso</label><input id="activities-pass" type="password" minLength={8} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Digite sua senha"/>
   <button type="submit" disabled={busy} className="w1-auth-submit">{busy?'Verificando acesso...':'Entrar nas atividades'}</button>
  </form>{notice&&<p className="w1-auth-feedback error" role="alert">{notice}</p>}
  <a className="w1-auth-back" href="/">Voltar ao CRM ou recuperar senha</a>
 </ProfessionalAuth>;
 if(access.loading)return <main className="reference-auth">Validando permissão...</main>;
 if(!access.allowed)return <main className="reference-auth"><p>Conta não autorizada neste CRM.</p><button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 return <CrmShell active="Minhas atividades" email={session.user.email||''} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard reference-activities">
   <header className="reference-header"><div><div className="reference-overline">GESTÃO OPERACIONAL · PROJECTW1SC</div><h1>Minhas atividades</h1><p>Registro pessoal de tarefas realizadas, contatos e tempo dedicado.</p></div><div className="reference-actions"><button className="reference-outline" disabled={busy} onClick={load}><RefreshCw size={17}/> Atualizar</button><button className="reference-outline" disabled={filtered.length===0} onClick={exportCsv}><Download size={17}/> Exportar</button></div></header>
   <div className="efferd-kpi-grid efferd-activities-metrics">
    <EfferdKpi icon={Activity} title="Atividades registradas" value={summary.total} sub="Lançamentos realizados"/>
    <EfferdKpi icon={Users} title="Clientes vinculados" value={summary.clients} sub="Clientes distintos" tone="info"/>
    <EfferdKpi icon={CheckCircle2} title="Contatos confirmados" value={summary.contacts} sub="Marcados manualmente" tone="ok"/>
    <EfferdKpi icon={FileClock} title="Sem cliente vinculado" value={summary.withoutClient} sub="Atividades gerais" tone="warn"/>
    <EfferdKpi icon={Clock3} title="Horas registradas" value={clock(summary.durationSeconds)} sub="Tempo informado" tone="default"/>
   </div>
   {notice&&<div role="status" className="reference-notice">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso">×</button></div>}
   <div className="reference-activity-grid">
    <section className="reference-panel">
     <div className="reference-panel-title"><Plus size={21}/><div><h2 id="activity-form-heading">{editingId?'Editar atividade':'Registrar atividade'}</h2><p>{editingId?'Altere apenas os dados que precisam de correção.':'Informe somente o trabalho realmente realizado.'}</p></div></div>
     <form className="reference-activity-form" onSubmit={save}>
      <label>Título da atividade *<input required minLength={4} maxLength={180} placeholder="O que você realizou?" value={form.title} onChange={e=>editForm('title',e.target.value)}/></label>
      <div className="reference-form-columns">
       <label>Categoria<select value={form.category} onChange={e=>editForm('category',e.target.value)}>{ACTIVITY_CATEGORIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
       <label>Data de realização<input required type="date" min="2020-01-01" max={today} value={form.date||today} onChange={e=>editForm('date',e.target.value)}/></label>
      </div>
      <label>Cliente relacionado (opcional)<select value={form.clientId} onChange={e=>editForm('clientId',e.target.value)}><option value="">Atividade sem cliente vinculado</option>{clients.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <div className="reference-form-columns reference-process-pair">
       <label>Número do processo (CNJ, opcional)<input inputMode="numeric" maxLength={32} placeholder="0000000-00.0000.0.00.0000" value={form.processNumber} onChange={e=>setForm(f=>({...f,processNumber:e.target.value,processType:e.target.value.trim()?f.processType:''}))}/></label>
       <label>Tipo do processo<select value={form.processType} disabled={!form.processNumber.trim()} onChange={e=>editForm('processType',e.target.value)}><option value="">Selecione o tipo</option>{PROCESS_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      </div>
      <label>Descrição / resultado<textarea rows={4} maxLength={4000} placeholder="Descreva o que foi feito ou resolvido." value={form.description} onChange={e=>editForm('description',e.target.value)}/></label>
      <label className="reference-check"><input type="checkbox" checked={form.contactConfirmed} disabled={form.category!=='atendimento'} onChange={e=>editForm('contactConfirmed',e.target.checked)}/><span>Houve contato real com o cliente. Marque apenas em Atendimento.</span></label>
      <div className="reference-timesheet">
       <button type="button" className="reference-timesheet-head" aria-expanded={showTimer} onClick={()=>setShowTimer(x=>!x)}><Clock3 size={18}/> Cronômetro e controle de horas <span>{showTimer?'−':'+'}</span></button>
       {showTimer&&<div className="reference-timesheet-body"><div className="reference-timer"><strong>{clock(elapsed)}</strong>{timerStart===null?<button type="button" className="reference-outline" onClick={startTimer}><Play size={15}/> Iniciar</button>:<button type="button" className="reference-outline" onClick={stopTimer}><Square size={15}/> Descartar</button>}</div><label>Ou registre minutos trabalhados<input type="number" min="0" max="1440" step="any" value={form.minutes} disabled={timerStart!==null} onChange={e=>editForm('minutes',e.target.value)}/></label></div>}
      </div>
      <div className="reference-activity-actions">
       {editingId&&<button type="button" disabled={busy} onClick={cancelEdit}>Cancelar edição</button>}
       <button disabled={busy} className="reference-primary" type="submit"><CheckCircle2 size={17}/>{busy?'Salvando...':editingId?'Salvar alterações':'Registrar atividade'}</button>
      </div>
     </form>
    </section>
    <section className="reference-panel">
     <div className="reference-panel-title"><History size={21}/><div><h2>Meu histórico completo</h2><p>Atividades separadas pelo responsável autenticado.</p></div></div>
     <div className="reference-inline-filters"><div className="reference-search"><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar atividade ou cliente"/></div><select aria-label="Filtrar categoria" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1)}}><option value="todos">Todas as categorias</option>{ACTIVITY_CATEGORIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
     <div className="reference-history-list">{history.rows.length?history.rows.map(x=><EntryCard key={x.id} item={x} client={byId.get(x.client_id)} onEdit={beginEdit} onDelete={deleteActivity} busy={busy}/>):<div className="reference-empty"><History size={26}/><strong>{busy?'Carregando atividades...':'Nenhuma atividade encontrada'}</strong><p>O histórico aparece aqui após o primeiro registro.</p></div>}</div>
     <div className="reference-pager"><span>Exibindo {history.rows.length} de {history.total} registros</span><div><button disabled={history.page<=1} onClick={()=>setPage(x=>x-1)}>Anterior</button><strong>{history.page} / {history.pages}</strong><button disabled={history.page>=history.pages} onClick={()=>setPage(x=>x+1)}>Próxima</button></div></div>
    </section>
   </div>
  </main>
 </CrmShell>;
}
