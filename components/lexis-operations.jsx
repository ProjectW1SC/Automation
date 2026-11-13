'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Archive,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Clock3,ExternalLink,FileText,Gavel,Plus,RefreshCw,Search,Users,X} from 'lucide-react';
import {buildLexisEvents} from '../lib/lexis-operations.mjs';
import {summarizeLexisReturns} from '../lib/lexis-return-kpis.mjs';
import {loadLexisCompanySources} from '../lib/lexis-company-data.mjs';
import LexisEventDetails from './lexis-event-details';
const brazilToday=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const iso=(year,month,day)=>new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
const fmt=d=>d?String(d).slice(0,10).split('-').reverse().join('/'):'Data não confirmada';
const kinds={retorno:'Retorno',prazo:'Prazo',audiencia:'Audiência',tarefa:'Tarefa'};
const statuses={vencido:'Vencido',atencao:'Atenção',em_dia:'Em dia',atendido:'Atendido',encerrado:'Encerrado',sem_data:'Sem data'};
function Chip({value,label}){return <span className={'lx-status lx-status--'+(statuses[value]?value:'sem_data')} data-status={value}>{label||statuses[value]||'Sem data'}</span>}
function Card({item,onSelect}){
 return <article className="lx-event-card">
  <div className="lx-event-symbol">{item.kind==='audiencia'?<Gavel size={18}/>:item.kind==='prazo'?<Clock3 size={18}/>:<CalendarDays size={18}/>}</div>
  <div className="lx-event-main"><small className="lx-event-kicker">{kinds[item.kind]||'Compromisso'} · {fmt(item.due_on)}{item.hour?' · '+item.hour:''}</small>
   <strong>{item.title}</strong>
   <span>{item.process_number||item.source||'Registro da empresa'}</span>
   <small>Responsável: {item.responsible||'Não informado'}</small>
  </div>
  <div className="lx-event-right"><Chip value={item.status} label={item.status_label}/><button className="lx-event-open" type="button" onClick={()=>onSelect(item)}>Detalhes <ChevronRight size={14}/></button></div>
 </article>;
}
export default function LexisOperations({db,session,area='deadlines'}){
 const [profile,setProfile]=useState(null),[team,setTeam]=useState([]),[sourceRows,setSourceRows]=useState({processes:[],hearings:[],tasks:[],manual:[]});
 const [errors,setErrors]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const [month,setMonth]=useState(brazilToday().slice(0,7)),[filter,setFilter]=useState('todos'),[showPast,setShowPast]=useState(false),[view,setView]=useState('month');
 const [validSources,setValidSources]=useState({processes:false,hearings:false});
 const [visibleLimit,setVisibleLimit]=useState(60);
 useEffect(()=>{setVisibleLimit(60)},[area,search,filter,month]);
 const [selected,setSelected]=useState(null),[editing,setEditing]=useState(false),[form,setForm]=useState({title:'',due_on:brazilToday(),kind:'tarefa',priority:'normal',notes:'',responsible:''});
 const currentYear=Number(month.slice(0,4)),currentMonth=Number(month.slice(5,7))-1;
 const first=iso(currentYear,currentMonth,1),last=iso(currentYear,currentMonth+1,0);
 const rangeStart=iso(currentYear,currentMonth,-6),rangeEnd=iso(currentYear,currentMonth+1,7);
 useEffect(()=>{
  let live=true;setLoading(true);
  (async()=>{
   try{
    const {data,error}=await db.from('usuarios').select('id,auth_user_id,empresa_id,nome').eq('auth_user_id',session.user.id).limit(2);
    if(error||data?.length!==1||!data[0].empresa_id)throw Error(error?.message||'Seu login não possui vínculo único com uma organização do LexisPredict.');
    const my=data[0];
    const all=await db.from('usuarios').select('id,auth_user_id,empresa_id,nome').eq('empresa_id',my.empresa_id).limit(250);
    if(all.error)throw Error(all.error.message);
    if(!live)return;
    setProfile(my);setTeam((all.data||[]).filter(x=>x.empresa_id===my.empresa_id));
    setForm(old=>({...old,responsible:my.nome||''}));
   }catch(err){if(live){setErrors(['Acesso bloqueado: '+err.message]);setLoading(false)}}
  })();
  return()=>{live=false};
 },[db,session.user.id]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setLoading(true);setErrors([]);setValidSources({processes:false,hearings:false});
  try{
   const loaded=await loadLexisCompanySources(db,profile.empresa_id);
   if(loaded.errors.length===4)throw new Error('Todas as fontes falharam: '+loaded.errors.join(' · '));
   setSourceRows(loaded.sources);setErrors(loaded.errors);setValidSources(loaded.valid);
  }catch(err){setErrors(['A consulta não foi concluída: '+(err.message||String(err))]);}
  finally{setLoading(false);}
 },[db,profile?.empresa_id]);
 useEffect(()=>{load()},[load]);
 const items=useMemo(()=>buildLexisEvents({...sourceRows,members:team,today:brazilToday()}),[sourceRows,team]);
 const areaRows=useMemo(()=>{
  let filtered=items;
  if(area==='audiencias')filtered=filtered.filter(x=>x.kind==='audiencia');
  if(area==='deadlines')filtered=filtered.filter(x=>x.kind==='retorno'&&x.process_id!=null&&x.status!=='encerrado');
  if(area==='agenda'&&filter==='todos')filtered=filtered.filter(x=>x.due_on&&x.due_on>=rangeStart&&x.due_on<=rangeEnd);
  if(area==='audiencias'&&!showPast)filtered=filtered.filter(x=>!x.due_on||x.due_on>=brazilToday());
  if(search.trim()){const term=search.toLocaleLowerCase('pt-BR').trim();
    filtered=filtered.filter(x=>[x.title,x.client_name,x.process_number,x.responsible,x.notes].some(z=>String(z||'').toLocaleLowerCase('pt-BR').includes(term)))}
  return filtered;
 },[items,area,search,showPast,rangeStart,rangeEnd,filter]);
 const listing=useMemo(()=>areaRows.filter(x=>{
  if(filter==='todos')return true;
  if(area==='audiencias')return filter==='futuras'?!!x.due_on&&x.due_on>=brazilToday()&&x.status!=='encerrado':x.status===filter;
  if(x.kind!=='retorno'||!x.process_id||x.status==='encerrado')return false;
  if(filter==='retornos')return true;
  if(filter==='hoje')return x.due_on===brazilToday()&&x.status!=='atendido'&&x.status!=='encerrado';
  if(filter==='proximos'){
   const end=new Date(brazilToday()+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+7);
   return x.due_on>=brazilToday()&&x.due_on<=end.toISOString().slice(0,10)&&x.status!=='atendido'&&x.status!=='encerrado';
  }
  return x.status===filter;
 }),[areaRows,filter,area]);
 const returnKpis=useMemo(()=>summarizeLexisReturns(sourceRows.processes,brazilToday()),[sourceRows.processes]);
 const allHearings=useMemo(()=>items.filter(x=>x.kind==='audiencia'),[items]);
 const hearingMetrics=[
  ['Registradas',allHearings.length,'todos'],
  ['Futuras',allHearings.filter(x=>x.due_on&&x.due_on>=brazilToday()&&x.status!=='encerrado').length,'futuras'],
  ['Sem data',allHearings.filter(x=>!x.due_on&&x.status!=='encerrado').length,'sem_data'],
  ['Passadas',allHearings.filter(x=>x.due_on&&x.due_on<brazilToday()&&x.status!=='encerrado').length,'vencido'],
  ['Canceladas',allHearings.filter(x=>x.status==='encerrado').length,'encerrado']
 ];
 const displayedMetrics=area==='audiencias'?hearingMetrics:[
  ['Retornos agendados',returnKpis.scheduled,'retornos'],
  ['Retornos vencidos',returnKpis.overdue,'vencido'],
  ['Retornos hoje',returnKpis.today,'hoje'],
  ['Próximos 7 dias',returnKpis.next7,'proximos'],
  ['Já atendidos',returnKpis.attended,'atendido']
 ];
 function chooseFilter(value){if(area==='audiencias'&&value==='vencido')setShowPast(true);if(area==='agenda')setView(value==='todos'?'month':'list');setFilter(value)}
 const save=async e=>{
  e.preventDefault();if(busy||!profile?.empresa_id)return;
  if(form.title.trim().length<3||form.title.length>250){setErrors(['O compromisso precisa ter título de 3 a 250 caracteres.']);return}
  setBusy(true);setErrors([]);
  try{
   const {data,error}=await db.from('office_deadlines').insert({
    owner_id:session.user.id,empresa_id:profile.empresa_id,title:form.title.trim(),due_on:form.due_on,kind:form.kind,
    priority:form.priority,status:'aberto',responsible:form.responsible||profile.nome,notes:form.notes.trim()||null
   }).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'O banco não confirmou o compromisso.');
   setEditing(false);setForm({title:'',due_on:brazilToday(),kind:'tarefa',priority:'normal',notes:'',responsible:profile.nome||''});await load();
  }catch(err){setErrors(['Compromisso não registrado: '+err.message])}finally{setBusy(false)}
 };
 const finish=async x=>{
  if(!x.manual_id||busy)return;setBusy(true);
  try{
   const {data,error}=await db.from('office_deadlines').update({status:'concluido',completed_at:new Date().toISOString()})
    .eq('id',x.manual_id).eq('empresa_id',profile.empresa_id).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Não confirmado.');
   setSelected(null);await load();
  }catch(err){setErrors(['Não foi possível concluir: '+err.message])}finally{setBusy(false)}
 };
 const openDetails=event=>setSelected(event);
 const gotoMonth=delta=>setMonth(iso(currentYear,currentMonth+delta,1).slice(0,7));
 const offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 const grid=Array.from({length:42},(_,i)=>iso(currentYear,currentMonth,1+i-offset));
 const groups=useMemo(()=>{const g=new Map();for(const x of listing){if(!x.due_on)continue;g.set(x.due_on,[...(g.get(x.due_on)||[]),x])}return g},[listing]);
 const subtitles={agenda:'Compromissos e audiências da organização, em uma única visão.',deadlines:'Retornos ao cliente com número CNJ e histórico de atendimento registrado.',audiencias:'Audiências registradas pelo LexisPredict e suas fontes.'};
 const titles={agenda:'Agenda',deadlines:'Prazos e retornos',audiencias:'Audiências'};
 if(!profile&&!loading)return <main className="inf-studio lx-workspace"><p role="alert" className="inf-note error">{errors[0]||'Acesso não autorizado.'}</p></main>;
 return <main className="inf-studio lx-workspace" data-lexis-operation={area}>
  <header className="inf-heading lx-workspace-heading"><div><small>INFINITUM / INTELIGÊNCIA JURÍDICA</small><h1>{titles[area]||'Agenda operacional'}</h1>
   <p>{subtitles[area]||subtitles.agenda}</p></div>
   <div className="inf-actions"><button className="inf-btn" type="button" onClick={load} disabled={loading}><RefreshCw size={15}/> Atualizar</button>
    {area==='deadlines'?<Link className="inf-btn primary" href="/agenda"><Plus size={15}/> Novo compromisso na Agenda</Link>:<button className="inf-btn primary" type="button" onClick={()=>setEditing(x=>!x)}><Plus size={15}/> Novo compromisso</button>}</div>
  </header>
  {errors.map((e,i)=><p key={i} className="inf-note error" role="status">{e}</p>)}
  {loading&&<p className="inf-note">Consultando registros da organização no Supabase do LexisPredict...</p>}
  <div className="lx-kpis">
   {displayedMetrics.map(([label,value,status])=>
    <button key={status} type="button" className={'lx-kpi '+(filter===status?'is-active':'')} onClick={()=>chooseFilter(status)} aria-pressed={filter===status}>
     <span>{label}</span><strong>{loading?'…':(area==='audiencias'?!validSources.hearings:!validSources.processes)?'—':Number(value).toLocaleString('pt-BR')}</strong><span className={'lx-kpi-mark lx-kpi-mark--'+status}/></button>)}
  </div>
  <section className="pr-module lx-panel">
   <div className="pr-module-intro"><span>CARTEIRA DA ORGANIZAÇÃO</span><h2>{area==='audiencias'?'Compromissos judiciais.':area==='agenda'?'Calendário compartilhado.':'Controle de vencimentos.'}</h2>
    <p>Os KPIs de retorno usam o mesmo cálculo global do Dashboard: último atendimento e próximo retorno, somente processos com CNJ. A Agenda filtra apenas a lista pelo mês.</p></div>
   <div className="lx-toolbar"><label className="lx-search"><Search size={16}/><input aria-label="Buscar nos compromissos" placeholder="Buscar cliente, processo ou responsável" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <select aria-label="Situação" value={filter} onChange={e=>chooseFilter(e.target.value)}>
     <option value="todos">Todas as situações</option>{area==='audiencias'?<><option value="futuras">Futuras</option>{Object.entries(statuses).filter(([k])=>k!=='atendido').map(([k,v])=><option key={k} value={k}>{k==='vencido'?'Passadas':v}</option>)}</>:<><option value="retornos">Retornos agendados</option><option value="hoje">Para hoje</option><option value="proximos">Próximos 7 dias</option><option value="atendido">Atendidos</option>{Object.entries(statuses).filter(([k])=>!['atendido','encerrado'].includes(k)).map(([k,v])=><option key={k} value={k}>{v}</option>)}</>}</select>
    {area==='audiencias'&&<label className="lx-check"><input type="checkbox" checked={showPast} onChange={e=>setShowPast(e.target.checked)}/> Incluir audiências anteriores</label>}
    {area==='agenda'&&<div className="lx-view-toggle"><button className="inf-btn" onClick={()=>setView('month')} aria-pressed={view==='month'}>Mês</button><button className="inf-btn" onClick={()=>setView('list')} aria-pressed={view==='list'}>Lista</button></div>}
   </div>
   {area==='agenda'&&<div className="lx-calendar-header"><button className="inf-btn" aria-label="Mês anterior" onClick={()=>gotoMonth(-1)}><ChevronLeft size={18}/></button>
    <strong>{new Date(first+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',month:'long',year:'numeric'})}</strong>
    <button className="inf-btn" aria-label="Próximo mês" onClick={()=>gotoMonth(1)}><ChevronRight size={18}/></button>
    <button className="inf-btn" onClick={()=>setMonth(brazilToday().slice(0,7))}>Hoje</button></div>}
   {area==='agenda'&&view==='month'&&<div className="lx-calendar-grid">
    {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><div key={d} className="lx-calendar-weekday">{d}</div>)}
    {grid.map(d=><div key={d} className={'lx-calendar-day '+(d.slice(0,7)!==month?'is-outside':'')+(d===brazilToday()?' is-today':'')}>
     <span>{Number(d.slice(8))}</span>{(groups.get(d)||[]).slice(0,3).map(e=><button key={e.id} type="button" title={e.title} onClick={()=>openDetails(e)} className={'lx-calendar-entry lx-calendar-entry--'+e.status}>{e.title}</button>)}
     {(groups.get(d)||[]).length>3&&<small>+{groups.get(d).length-3} registros</small>}
    </div>)}
   </div>}
   {(area!=='agenda'||view==='list')&&<div className="lx-event-list">{listing.slice(0,visibleLimit).map(x=><Card key={x.id} item={x} onSelect={openDetails}/>)}
    {listing.length>visibleLimit&&<div className="lx-load-more"><span>Mostrando {visibleLimit} de {listing.length} registros</span><button type="button" className="inf-btn" onClick={()=>setVisibleLimit(v=>v+60)}>Carregar mais</button></div>}
    {!loading&&!listing.length&&<p className="pr-list-empty">Nenhum registro corresponde aos filtros. Confira as fontes e altere o período quando necessário.</p>}
   </div>}
   {area==='audiencias'&&<p className="inf-note">Audiências passadas não são prazos vencidos. Marque "Incluir audiências anteriores" para conferir eventos anteriores. As sem data ainda exigem confirmação oficial.</p>}
   {area==='deadlines'&&<p className="inf-note">Regra do LexisPredict: retorno vencido = próximo retorno anterior a hoje, sem atendimento na data combinada ou posterior, em processo ativo com CNJ. Datas antigas de proximo_prazo e compromissos manuais não são contabilizados. Confira tarefas manuais na Agenda.</p>}
  </section>
  {selected&&<LexisEventDetails key={selected.id} event={selected} db={db} profile={profile} onClose={()=>setSelected(null)} onSaved={load} onFinish={finish} busy={busy}/>}
  {editing&&<section className="pr-module lx-detail"><div className="lx-detail-head"><div><small>CADASTRO OPERACIONAL</small><h2>Novo compromisso</h2></div><button className="inf-btn" onClick={()=>setEditing(false)}><X size={14}/> Cancelar</button></div>
   <p>O compromisso será salvo para a organização, sem alterar movimentos oficiais do tribunal.</p>
   <form onSubmit={save} className="lx-form">
    <label>Título<input required minLength={3} maxLength={250} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Data<input type="date" required value={form.due_on} onChange={e=>setForm({...form,due_on:e.target.value})}/></label>
    <label>Tipo<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="tarefa">Tarefa</option><option value="retorno">Retorno</option><option value="prazo">Prazo manual</option><option value="audiencia">Audiência manual (não verificada)</option></select></label>
    <label>Prioridade<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
    <label>Responsável<select value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}>{team.filter(m=>m.nome).map(m=><option key={m.id} value={m.nome}>{m.nome}</option>)}</select></label>
    <label className="lx-form-full">Observações<textarea maxLength={1500} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
    <button className="inf-btn primary" type="submit" disabled={busy}>Salvar compromisso da empresa</button>
   </form>
  </section>}
 </main>;
}
