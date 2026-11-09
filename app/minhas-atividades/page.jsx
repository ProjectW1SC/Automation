'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,ArrowLeft,CalendarDays,CheckCircle2,Clock3,Download,FileClock,History,Loader2,Play,Plus,RefreshCw,Search,Square,UserRound,Users,ShieldCheck} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import {getClient} from '../../lib/supabase-client';
import {ADMIN_EMAIL,signInWithPassword} from '../../lib/login.mjs';
import {todayBrazil} from '../../lib/tarefas.mjs';
import {ACTIVITY_CATEGORIES,categoryLabel,validateCompletedActivity,activitySummary,paginateActivities,toCsvCell} from '../../lib/minhas-atividades.mjs';
const TIMER_KEY='projectw1sc_activity_timer_v1';
const labels=Object.fromEntries(ACTIVITY_CATEGORIES.map(a=>[a.value,a.label]));
const brDate=x=>x?new Date(x+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';
const clock=n=>[Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,'0')).join(':');
function EntryCard({item,client}){
 return <article className="reference-activity-card">
  <div className="reference-row-between">
   <span className="reference-tag"><CalendarDays size={14}/> {brDate(item.performed_on)} · {categoryLabel(item.category)}</span>
   {item.contact_confirmed&&<span className="reference-status good"><CheckCircle2 size={13}/> Contato confirmado</span>}
  </div>
  <h3>{item.title}</h3>
  {item.description&&<p>{item.description}</p>}
  <div className="reference-related">
    <span className="reference-overline">VÍNCULO COM O CLIENTE</span>
    {client?<div className="reference-related-grid"><span><b>Cliente</b>{client.name}</span><span><b>Financeira</b>{client.institution||'Não cadastrada'}</span><span><b>Contato realizado</b>{client.contacted_party||'Não informado'}</span><span><b>Situação</b>{client.workflow_status==='finalizado'?'Finalizado':'Ativo'}</span></div>:<p>Atividade sem cliente vinculado. Nenhuma associação presumida.</p>}
  </div>
  <div className="reference-entry-footer"><span><Clock3 size={13}/> {Number(item.duration_seconds)>0?clock(item.duration_seconds)+' registrados':'Sem horas vinculadas'}</span><span>Registro: {new Date(item.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</span></div>
 </article>;
}
export default function MinhasAtividades(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[password,setPassword]=useState('');
 const [records,setRecords]=useState([]),[clients,setClients]=useState([]),[search,setSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState('todos'),[page,setPage]=useState(1);
 const [form,setForm]=useState({title:'',description:'',category:'atendimento',date:'',clientId:'',contactConfirmed:false,minutes:'0'});
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
   db.from('crm_completed_activities').select('*').eq('actor_id',session.user.id).order('performed_on',{ascending:false}).order('created_at',{ascending:false}).limit(1000),
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
  return !q||[r.title,r.description,byId.get(r.client_id)?.name,r.category].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(q))
 }),[records,categoryFilter,search,byId]);
 const history=useMemo(()=>paginateActivities(filtered,page,12),[filtered,page]);
 function editForm(key,v){setForm(f=>({...f,[key]:v}))}
 function stopTimer(){setTimerStart(null);window.localStorage.removeItem(TIMER_KEY)}
 function startTimer(){const at=Date.now();setTimerStart(at);window.localStorage.setItem(TIMER_KEY,String(at))}
 async function save(e){
  e.preventDefault();if(busy)return;
  let activity;
  try{activity=validateCompletedActivity({...form,date:form.date||today,clientId:form.clientId||null,durationSeconds:timerStart!==null?elapsed:Math.round(Number(form.minutes||0)*60)},today)}
  catch(err){setNotice(err.message);return}
  setBusy(true);setNotice('');
  const {error}=await db.from('crm_completed_activities').insert({...activity,actor_id:session.user.id});
  if(error){setNotice('Não foi possível registrar atividade: '+error.message);setBusy(false);return}
  if(timerStart!==null)stopTimer();
  setForm({title:'',description:'',category:'atendimento',date:today,clientId:'',contactConfirmed:false,minutes:'0'});
  setPage(1);setCategoryFilter('todos');
  await load();setNotice('Atividade concluída registrada no seu histórico privado.');setBusy(false);
 }
 function exportCsv(){
  const rows=[['Data','Categoria','Título','Descrição','Cliente','Contato confirmado','Duração (minutos)'],...filtered.map(x=>[
   x.performed_on,labels[x.category]||x.category,x.title,x.description||'',byId.get(x.client_id)?.name||'',
   x.contact_confirmed?'Sim':'Não',Math.round(Number(x.duration_seconds||0)/60)
  ])];
  const csv='\uFEFF'+rows.map(row=>row.map(toCsvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='projectw1sc-minhas-atividades.csv';a.click();
  URL.revokeObjectURL(url);
 }
 if(!db)return <main className="reference-auth"><h1>CRM em configuração</h1><p>Configuração de acesso não encontrada.</p></main>;
 if(checking)return <main className="reference-auth"><Loader2 size={24} className="task-spin"/> Verificando acesso...</main>;
 if(!session)return <main className="reference-auth"><div className="reference-auth-card"><h1>Minhas atividades</h1><p>Entre com seu acesso ProjectW1SC.</p><form onSubmit={async e=>{
  e.preventDefault();setBusy(true);try{const {session:s}=await signInWithPassword(db.auth,password);setSession(s);setNotice('')}catch(err){setNotice(err.message)}finally{setBusy(false)}
 }}><input type="email" readOnly value={ADMIN_EMAIL} aria-label="E-mail"/><input type="password" minLength={8} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha"/><button type="submit" disabled={busy} className="reference-primary">Entrar</button></form>{notice&&<p role="alert">{notice}</p>}<a href="/"><ArrowLeft size={15}/> Voltar ao CRM</a></div></main>;
 if(session.user.email?.toLowerCase()!==ADMIN_EMAIL)return <main className="reference-auth"><p>Conta não autorizada neste CRM.</p><button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 return <CrmShell active="Minhas atividades" email={session.user.email||''} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard reference-activities">
   <header className="reference-header"><div><div className="reference-overline">GESTÃO OPERACIONAL · PROJECTW1SC</div><h1>Minhas atividades</h1><p>Registro pessoal de tarefas realizadas, contatos e tempo dedicado.</p></div><div className="reference-actions"><button className="reference-outline" disabled={busy} onClick={load}><RefreshCw size={17}/> Atualizar</button><button className="reference-outline" disabled={filtered.length===0} onClick={exportCsv}><Download size={17}/> Exportar</button></div></header>
   <div className="reference-metrics reference-metrics-5">
    {[{icon:Activity,label:'Atividades registradas',value:summary.total,description:'Lançamentos realizados'},
      {icon:Users,label:'Clientes vinculados',value:summary.clients,description:'Clientes distintos'},
      {icon:CheckCircle2,label:'Contatos confirmados',value:summary.contacts,description:'Marcados manualmente'},
      {icon:FileClock,label:'Sem cliente vinculado',value:summary.withoutClient,description:'Atividades gerais'},
      {icon:Clock3,label:'Horas registradas',value:clock(summary.durationSeconds),description:'Tempo informado'}].map((m,i)=>{
        const Icon=m.icon;return <div className="reference-kpi" key={m.label}><div className="reference-kpi-icon"><Icon size={20}/></div><div><span>{m.label}</span><strong className={i===4?'compact':''}>{m.value}</strong><small>{m.description}</small></div></div>
      })}
   </div>
   {notice&&<div role="status" className="reference-notice">{notice}<button onClick={()=>setNotice('')} aria-label="Fechar aviso">×</button></div>}
   <div className="reference-activity-grid">
    <section className="reference-panel">
     <div className="reference-panel-title"><Plus size={21}/><div><h2>Registrar atividade</h2><p>Informe somente o trabalho realmente realizado.</p></div></div>
     <form className="reference-activity-form" onSubmit={save}>
      <label>Título da atividade *<input required minLength={4} maxLength={180} placeholder="O que você realizou?" value={form.title} onChange={e=>editForm('title',e.target.value)}/></label>
      <div className="reference-form-columns">
       <label>Categoria<select value={form.category} onChange={e=>editForm('category',e.target.value)}>{ACTIVITY_CATEGORIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
       <label>Data de realização<input required type="date" min="2020-01-01" max={today} value={form.date||today} onChange={e=>editForm('date',e.target.value)}/></label>
      </div>
      <label>Cliente relacionado (opcional)<select value={form.clientId} onChange={e=>editForm('clientId',e.target.value)}><option value="">Atividade sem cliente vinculado</option>{clients.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      <label>Descrição / resultado<textarea rows={4} maxLength={4000} placeholder="Descreva o que foi feito ou resolvido." value={form.description} onChange={e=>editForm('description',e.target.value)}/></label>
      <label className="reference-check"><input type="checkbox" checked={form.contactConfirmed} disabled={form.category!=='atendimento'} onChange={e=>editForm('contactConfirmed',e.target.checked)}/><span>Houve contato real com o cliente. Marque apenas em Atendimento.</span></label>
      <div className="reference-timesheet">
       <button type="button" className="reference-timesheet-head" aria-expanded={showTimer} onClick={()=>setShowTimer(x=>!x)}><Clock3 size={18}/> Cronômetro e controle de horas <span>{showTimer?'−':'+'}</span></button>
       {showTimer&&<div className="reference-timesheet-body"><div className="reference-timer"><strong>{clock(elapsed)}</strong>{timerStart===null?<button type="button" className="reference-outline" onClick={startTimer}><Play size={15}/> Iniciar</button>:<button type="button" className="reference-outline" onClick={stopTimer}><Square size={15}/> Descartar</button>}</div><label>Ou registre minutos trabalhados<input type="number" min="0" max="1440" value={form.minutes} disabled={timerStart!==null} onChange={e=>editForm('minutes',e.target.value)}/></label></div>}
      </div>
      <button disabled={busy} className="reference-primary" type="submit"><CheckCircle2 size={17}/>{busy?'Salvando...':'Registrar atividade'}</button>
     </form>
    </section>
    <section className="reference-panel">
     <div className="reference-panel-title"><History size={21}/><div><h2>Meu histórico completo</h2><p>Atividades separadas pelo responsável autenticado.</p></div></div>
     <div className="reference-inline-filters"><div className="reference-search"><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar atividade ou cliente"/></div><select aria-label="Filtrar categoria" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1)}}><option value="todos">Todas as categorias</option>{ACTIVITY_CATEGORIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
     <div className="reference-history-list">{history.rows.length?history.rows.map(x=><EntryCard key={x.id} item={x} client={byId.get(x.client_id)}/>):<div className="reference-empty"><History size={26}/><strong>{busy?'Carregando atividades...':'Nenhuma atividade encontrada'}</strong><p>O histórico aparece aqui após o primeiro registro.</p></div>}</div>
     <div className="reference-pager"><span>Exibindo {history.rows.length} de {history.total} registros</span><div><button disabled={history.page<=1} onClick={()=>setPage(x=>x-1)}>Anterior</button><strong>{history.page} / {history.pages}</strong><button disabled={history.page>=history.pages} onClick={()=>setPage(x=>x+1)}>Próxima</button></div></div>
    </section>
   </div>
  </main>
 </CrmShell>;
}
