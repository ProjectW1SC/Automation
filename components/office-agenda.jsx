'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,ChevronLeft,ChevronRight,RefreshCw,Plus,Clock3,AlertTriangle,CheckCircle2,FileText,ExternalLink,Download,Filter,Users,BriefcaseBusiness,X} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import {todayBrazil} from '../lib/tarefas.mjs';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
import {buildAgendaEvents,weekDates,agendaStats} from '../lib/blackhole-agenda.mjs';
import {createIcsEvent} from '../lib/blackhole-free-integrations.mjs';
const FILTERS=[['todos','Tudo'],['prazo','Prazos'],['audiencia','Audiências'],['retorno','Retornos'],['tarefa','Tarefas'],['novidade','Novidades'],['atendido','Atendidos']];
const TYPES={
 prazo:{label:'Prazo',tone:'deadline'},audiencia:{label:'Audiência',tone:'hearing'},
 retorno:{label:'Retorno',tone:'return'},tarefa:{label:'Tarefa',tone:'task'},
 novidade:{label:'Novidade',tone:'news'},atendido:{label:'Atendido',tone:'done'}
};
const fmt=(value,opts={})=>new Intl.DateTimeFormat('pt-BR',opts).format(new Date(value+'T12:00:00'));
const shift=(value,amount)=>{const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+amount);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const emptyForm={title:'',date:'',kind:'prazo',priority:'normal',client_id:'',case_id:'',responsible:'',notes:''};
function Agenda({db,session}){
 const today=todayBrazil();
 const [anchor,setAnchor]=useState(today),[selectedDate,setSelectedDate]=useState(today);
 const [view,setView]=useState('week'),[filter,setFilter]=useState('todos');
 const [deadlines,setDeadlines]=useState([]),[clients,setClients]=useState([]),[cases,setCases]=useState([]),[snapshots,setSnapshots]=useState([]);
 const [selected,setSelected]=useState(null),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 const [notice,setNotice]=useState(''),[showForm,setShowForm]=useState(false),[form,setForm]=useState(emptyForm);
 const [loadError,setLoadError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setLoadError('');
  try{
   const results=await Promise.all([
    withAuthDeadline(db.from('office_deadlines').select('*').order('due_on',{ascending:true}).limit(1200),12000),
    withAuthDeadline(db.from('office_clients').select('id,name,phone,status,next_return,responsible').limit(1000),12000),
    withAuthDeadline(db.from('office_cases').select('id,client_id,title,process_number,tribunal,status,next_review').limit(1200),12000),
    withAuthDeadline(db.from('crm_judicial_snapshots').select('process_number,source,checked_at,payload').order('checked_at',{ascending:false}).limit(700),12000)
   ]);
   const failed=results.find(x=>x.error);
   if(failed)throw failed.error;
   setDeadlines(results[0].data||[]);setClients(results[1].data||[]);
   setCases(results[2].data||[]);setSnapshots(results[3].data||[]);
  }catch(e){setLoadError('Não foi possível atualizar toda a agenda: '+String(e?.message||e));}
  finally{setLoading(false)}
 },[db]);
 useEffect(()=>{load()},[load]);
 const events=useMemo(()=>{
  try{return buildAgendaEvents({deadlines,clients,cases,snapshots,today})}
  catch{return []}
 },[deadlines,clients,cases,snapshots,today]);
 const week=useMemo(()=>weekDates(anchor),[anchor]);
 const stats=useMemo(()=>agendaStats(events,today),[events,today]);
 const visible=useMemo(()=>events.filter(e=>(filter==='todos'||e.kind===filter)&&(view==='day'?e.date===selectedDate:week.includes(e.date))),[events,filter,view,selectedDate,week]);
 const selectedEvent=visible.find(e=>e.id===selected?.id)||selected||null;
 const eventsByDate=useMemo(()=>{const map=new Map();for(const date of week)map.set(date,visible.filter(e=>e.date===date));return map},[week,visible]);
 const periodLabel=view==='day'?fmt(selectedDate,{weekday:'long',day:'2-digit',month:'long',year:'numeric'}):
  fmt(week[0],{day:'2-digit',month:'short'})+' — '+fmt(week[6],{day:'2-digit',month:'long',year:'numeric'});
 function movePeriod(direction){const amount=view==='day'?direction:direction*7;const next=shift(anchor,amount);setAnchor(next);if(view==='day')setSelectedDate(next)}
 function todayClick(){setAnchor(today);setSelectedDate(today)}
 function openEvent(event){setSelected(event)}
 async function saveEvent(e){
  e.preventDefault();if(saving)return;
  const title=form.title.trim();
  if(title.length<3){setNotice('Informe um título com pelo menos três caracteres.');return}
  if(!form.date){setNotice('Escolha a data do compromisso.');return}
  if(form.kind==='audiencia'&&form.date<today){setNotice('Audiências passadas não são cadastradas na agenda operacional.');return}
  setSaving(true);setNotice('');
  try{
   const linkedCase=cases.find(x=>x.id===form.case_id)||null;
   const row={owner_id:session.user.id,title:title.slice(0,250),due_on:form.date,kind:form.kind,
    priority:form.priority,status:'aberto',client_id:form.client_id||linkedCase?.client_id||null,
    case_id:form.case_id||null,responsible:form.responsible.trim()||null,source:'manual',
    source_url:null,verified:false,notes:form.notes.trim().slice(0,2000)||null};
   const saved=await db.from('office_deadlines').insert(row).select('id').single();
   if(saved.error)throw Error(saved.error.message);
   if(!saved.data?.id)throw Error('O banco não confirmou a gravação.');
   setNotice('Compromisso cadastrado e confirmado no CRM.');
   setForm(emptyForm);setShowForm(false);setAnchor(form.date);setSelectedDate(form.date);await load();
  }catch(e){setNotice('Não foi possível salvar: '+e.message)}
  finally{setSaving(false)}
 }
 function exportEvent(event){
  try{
   const content=createIcsEvent({title:event.title,date:event.date,description:[event.subtitle,event.evidence,event.source?'Origem: '+event.source:''].filter(Boolean).join('\n'),uid:'blackhole-agenda-'+event.id});
   const blob=new Blob([content],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='blackhole-agenda.ics';a.click();URL.revokeObjectURL(url);
  }catch(e){setNotice('Não foi possível exportar: '+e.message)}
 }
 const EventButton=({event})=><button type="button" key={event.id} className={'agenda-event agenda-event-'+(TYPES[event.kind]?.tone||'task')+(event.overdue?' is-overdue':'')+(selectedEvent?.id===event.id?' is-selected':'')} onClick={()=>openEvent(event)}>
  <span className="agenda-event-time">{event.time||'Dia todo'}</span><strong>{event.title}</strong>
  {event.subtitle&&<small>{event.subtitle}</small>}
  {event.source&&<span className="agenda-event-source">{event.source}</span>}
 </button>;
 return <main className="inf-studio blackhole-agenda">
  <header className="inf-heading agenda-heading">
   <div><small>BLACKHOLE / ROTINA DO ESCRITÓRIO</small><h1>Agenda</h1><p>Compromissos, prazos, audiências e retornos da carteira jurídica em um só calendário.</p></div>
   <div className="agenda-actions"><Link className="inf-btn" href="/audiencias"><CalendarDays size={15}/> Audiências</Link>
    <button className="inf-btn" type="button" onClick={()=>{setShowForm(x=>!x);setNotice('')}}><Plus size={15}/> Novo compromisso</button>
    <button className="inf-btn primary" type="button" onClick={load} disabled={loading}><RefreshCw size={14}/> {loading?'Atualizando':'Atualizar'}</button>
   </div>
  </header>
  <section className="agenda-stats" aria-label="Resumo da semana">
   <article className="agenda-stat"><span>Prazos na semana</span><strong>{stats.prazos}</strong><small>{stats.prazosHoje} para hoje</small></article>
   <article className="agenda-stat agenda-stat-danger"><span>Vencidos</span><strong>{stats.vencidos}</strong><small>Precisam de revisão</small></article>
   <article className="agenda-stat agenda-stat-blue"><span>Audiências</span><strong>{stats.audiencias}</strong><small>Datas futuras e cadastradas</small></article>
   <article className="agenda-stat agenda-stat-green"><span>Retornos</span><strong>{stats.retornos}</strong><small>Clientes para contatar</small></article>
   <article className="agenda-stat"><span>Novidades oficiais</span><strong>{stats.novidades}</strong><small>Movimentações com data registrada</small></article>
  </section>
  {showForm&&<section className="inf-panel agenda-new-form">
   <div className="office-toolbar"><div><h2>Novo compromisso</h2><p>O item será gravado na carteira privada. Horário não informado permanece como dia inteiro.</p></div><button className="inf-btn" type="button" onClick={()=>setShowForm(false)}><X size={14}/> Fechar</button></div>
   <form onSubmit={saveEvent}>
    <div className="inf-fields">
     <label>Título<input required minLength={3} maxLength={250} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Ex.: Conferir documentos do cliente"/></label>
     <label>Data<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
     <label>Tipo<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="prazo">Prazo</option><option value="audiencia">Audiência</option><option value="retorno">Retorno</option><option value="tarefa">Tarefa</option></select></label>
     <label>Prioridade<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
     <label>Cliente<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Sem cliente vinculado</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <label>Processo<select value={form.case_id} onChange={e=>setForm({...form,case_id:e.target.value})}><option value="">Sem processo vinculado</option>{cases.map(x=><option key={x.id} value={x.id}>{x.process_number||x.title}</option>)}</select></label>
     <label>Responsável<input maxLength={120} value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})} placeholder="Responsável pelo compromisso"/></label>
     <label>Observações<input maxLength={2000} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Informações e origem"/></label>
    </div>
    <div className="agenda-form-actions"><button className="inf-btn primary" type="submit" disabled={saving}>{saving?'Salvando...':'Salvar compromisso'}</button></div>
   </form>
  </section>}
  {notice&&<p className="inf-note" role="status">{notice}</p>}
  {loadError&&<p className="inf-note error" role="alert">{loadError}</p>}
  <div className="agenda-layout">
   <section className="inf-panel agenda-calendar-panel">
    <div className="agenda-toolbar">
     <div className="agenda-period"><div className="agenda-period-title">{periodLabel}</div><div className="agenda-period-controls">
      <button type="button" className="agenda-icon-button" onClick={()=>movePeriod(-1)} aria-label="Período anterior"><ChevronLeft size={17}/></button>
      <button type="button" className="agenda-today-button" onClick={todayClick}>Hoje</button>
      <button type="button" className="agenda-icon-button" onClick={()=>movePeriod(1)} aria-label="Próximo período"><ChevronRight size={17}/></button>
     </div></div>
     <div className="agenda-view-switch" role="group" aria-label="Visualização da agenda">
      <button type="button" aria-pressed={view==='week'} onClick={()=>setView('week')}>Semana</button>
      <button type="button" aria-pressed={view==='day'} onClick={()=>setView('day')}>Dia</button>
      <button type="button" aria-pressed={view==='list'} onClick={()=>setView('list')}>Lista</button>
     </div>
    </div>
    <div className="agenda-filter-row" aria-label="Filtrar compromissos"><Filter size={14}/>{FILTERS.map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    {view==='week'&&<div className="agenda-week-grid">
     {week.map(date=>{const dayEvents=eventsByDate.get(date)||[];const dateObj=new Date(date+'T12:00:00');return <div key={date} className={'agenda-day-column'+(date===today?' is-today':'')+(date===selectedDate?' is-active':'')}>
      <button type="button" className="agenda-day-heading" onClick={()=>{setSelectedDate(date);setView('day')}}><span>{fmt(date,{weekday:'short'}).replace('.','')}</span><strong>{dateObj.getDate()}</strong></button>
      <div className="agenda-day-events">{dayEvents.slice(0,5).map(event=><EventButton key={event.id} event={event}/>)}
       {dayEvents.length>5&&<button type="button" className="agenda-more" onClick={()=>{setSelectedDate(date);setView('day')}}>+ {dayEvents.length-5} itens</button>}
       {!dayEvents.length&&<span className="agenda-empty-day">—</span>}
      </div>
     </div>})}
    </div>}
    {view==='day'&&<div className="agenda-day-view"><div className="agenda-day-view-date"><strong>{fmt(selectedDate,{weekday:'long',day:'2-digit',month:'long'})}</strong><span>{visible.length} compromisso(s)</span></div>
     {visible.length?visible.map(event=><EventButton key={event.id} event={event}/>):<div className="agenda-empty"><CalendarDays size={24}/><strong>Nenhum compromisso nesta data</strong><span>Os itens cadastrados aparecerão aqui.</span></div>}
    </div>}
    {view==='list'&&<div className="agenda-list-view">
     {week.map(date=>{const dayEvents=eventsByDate.get(date)||[];if(!dayEvents.length)return null;return <section key={date} className="agenda-list-day"><h3><span>{fmt(date,{weekday:'long'})}</span><small>{fmt(date,{day:'2-digit',month:'short'})}</small></h3>{dayEvents.map(event=><EventButton key={event.id} event={event}/>)}</section>})}
     {!visible.length&&<div className="agenda-empty"><CalendarDays size={24}/><strong>Nenhum item encontrado nesta semana</strong><span>Experimente outro filtro ou período.</span></div>}
    </div>}
   </section>
   <aside className="inf-panel agenda-detail">
    <div className="agenda-detail-top"><span>DETALHES DO COMPROMISSO</span><span className="agenda-detail-date">{selectedEvent?fmt(selectedEvent.date,{day:'2-digit',month:'short'}):'—'}</span></div>
    {selectedEvent?<>
     <span className={'agenda-type-pill agenda-type-'+(TYPES[selectedEvent.kind]?.tone||'task')}>{TYPES[selectedEvent.kind]?.label||'Compromisso'}</span>
     <h2>{selectedEvent.title}</h2>
     {selectedEvent.subtitle&&<p className="agenda-detail-subtitle">{selectedEvent.subtitle}</p>}
     <dl className="agenda-detail-list">
      <div><dt>Data</dt><dd>{fmt(selectedEvent.date,{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</dd></div>
      <div><dt>Horário</dt><dd>{selectedEvent.time||'Não informado · dia inteiro'}</dd></div>
      {selectedEvent.clientName&&<div><dt>Cliente</dt><dd>{selectedEvent.clientName}</dd></div>}
      {selectedEvent.processNumber&&<div><dt>Processo</dt><dd>{selectedEvent.processNumber}</dd></div>}
      {selectedEvent.tribunal&&<div><dt>Tribunal</dt><dd>{selectedEvent.tribunal}</dd></div>}
      {selectedEvent.priority&&<div><dt>Prioridade</dt><dd>{selectedEvent.priority}</dd></div>}
      {selectedEvent.source&&<div><dt>Origem</dt><dd>{selectedEvent.source}</dd></div>}
     </dl>
     {selectedEvent.evidence&&<div className="agenda-evidence"><strong>Registro / evidência</strong><p>{selectedEvent.evidence}</p></div>}
     {selectedEvent.status&&<p className="agenda-detail-status">{selectedEvent.status}</p>}
     <div className="agenda-detail-actions">
      {selectedEvent.caseId&&<Link className="inf-btn" href={'/processos?case='+encodeURIComponent(selectedEvent.caseId)}><BriefcaseBusiness size={14}/> Abrir processo</Link>}
      {selectedEvent.clientId&&<Link className="inf-btn" href={'/clientes?client='+encodeURIComponent(selectedEvent.clientId)}><Users size={14}/> Abrir cliente</Link>}
      {selectedEvent.sourceUrl&&<a className="inf-btn" href={selectedEvent.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Fonte oficial</a>}
      <button className="inf-btn" type="button" onClick={()=>exportEvent(selectedEvent)}><Download size={14}/> Exportar .ics</button>
     </div>
    </>:<div className="agenda-empty-detail"><CalendarDays size={28}/><strong>Selecione um compromisso</strong><span>Os detalhes, vínculos e a origem aparecem aqui.</span></div>}
   </aside>
  </div>
  <p className="agenda-footnote"><ShieldCheck size={13}/> Audiências extraídas de publicações são identificadas como possíveis e exigem conferência no tribunal. Horários não são presumidos. A agenda não cria prazos judiciais automaticamente.</p>
 </main>;
}
export default function OfficeAgenda(){return <SecuredWorkspace active="Agenda">{({db,session})=><Agenda db={db} session={session}/>}</SecuredWorkspace>}
