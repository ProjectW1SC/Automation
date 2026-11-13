'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,ChevronLeft,ChevronRight,Plus,RefreshCw,CheckCircle2} from 'lucide-react';
import SecuredWorkspace from '../../components/secured-workspace';
import LexisOperations from '../../components/lexis-operations';
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const iso=(year,month,day)=>new Date(Date.UTC(year,month,day)).toISOString().slice(0,10);
const dateName=s=>new Date(s+'T12:00:00Z').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
const kinds={prazo:'Prazo',audiencia:'Audiência',retorno:'Retorno',tarefa:'Tarefa'};
function Agenda({db,session}){
 const [month,setMonth]=useState(today().slice(0,7)),[rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [view,setView]=useState('month'),[filter,setFilter]=useState('abertos'),[editing,setEditing]=useState(false),[selected,setSelected]=useState(null);
 const [form,setForm]=useState({title:'',due_on:today(),kind:'retorno',priority:'normal',responsible:'',notes:''});
 const year=Number(month.slice(0,4)),m=Number(month.slice(5,7))-1;
 const first=iso(year,m,1),last=iso(year,m+1,0),startOffset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 const grid=Array.from({length:42},(_,i)=>iso(year,m,1+i-startOffset));
 const load=useCallback(async()=>{setError('');
  const lexis=process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1';
  if(lexis){
   // Agenda operacional a partir de retornos da carteira Lexis (processos.proximo_retorno).
   const {data:userRows,error:uErr}=await db.from('usuarios').select('empresa_id').eq('auth_user_id',session.user.id).limit(1);
   if(uErr||!userRows?.[0]?.empresa_id){setError('Não foi possível identificar a empresa no Lexis: '+(uErr?.message||'sem empresa_id'));setRows([]);return;}
   const empresaId=userRows[0].empresa_id;
   const start=iso(year,m,-6),end=iso(year,m+1,7);
   const a=await db.from('processos').select('id,cliente,protocolo_ref,proximo_retorno,advogado,tribunal,status_interno,observacoes')
    .eq('empresa_id',empresaId).not('proximo_retorno','is',null)
    .gte('proximo_retorno',start).lte('proximo_retorno',end)
    .order('proximo_retorno',{ascending:true}).limit(500);
   if(a.error){setError('Não foi possível carregar a agenda Lexis: '+a.error.message);setRows([]);return;}
   setRows((a.data||[]).map(r=>({
    id:r.id,
    title:r.cliente||r.protocolo_ref||'Retorno',
    due_on:String(r.proximo_retorno).slice(0,10),
    kind:'retorno',
    status:'aberto',
    priority:'normal',
    responsible:r.advogado||'',
    notes:[r.protocolo_ref,r.tribunal,r.observacoes].filter(Boolean).join(' · ')
   })));
   return;
  }
  const a=await db.from('office_deadlines').select('id,title,due_on,kind,status,priority,responsible,notes').gte('due_on',iso(year,m,-6)).lte('due_on',iso(year,m+1,7)).order('due_on',{ascending:true}).limit(500);
  if(a.error)setError('Não foi possível carregar a agenda: '+a.error.message);else setRows(a.data||[]);
 },[db,year,m,session?.user?.id]);
 useEffect(()=>{load()},[load]);
 const visible=useMemo(()=>rows.filter(x=>(filter==='todos'||x.status==='aberto')&&!(x.kind==='audiencia'&&x.due_on<today())),[rows,filter]);
 const move=delta=>setMonth(iso(year,m+delta,1).slice(0,7));
 async function save(e){e.preventDefault();if(busy)return;if(process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1'){setError('Neste modo Lexis, agende o próximo retorno editando o processo em /processos (campo próximo retorno / atendimento).');return;}setBusy(true);setError('');const row={title:form.title.trim(),due_on:form.due_on,kind:form.kind,priority:form.priority,responsible:form.responsible.trim()||null,notes:form.notes.trim()||null};if(row.title.length<3||row.title.length>250){setError('Título deve ter entre 3 e 250 caracteres.');setBusy(false);return}const result=await db.from('office_deadlines').insert({...row,owner_id:session.user.id}).select('id').single();setBusy(false);if(result.error){setError(result.error.message);return}setEditing(false);setForm({title:'',due_on:today(),kind:'retorno',priority:'normal',responsible:'',notes:''});await load()}
 async function conclude(row){setBusy(true);const res=await db.from('office_deadlines').update({status:'concluido',completed_at:new Date().toISOString()}).eq('id',row.id);setBusy(false);if(res.error)setError(res.error.message);else{setSelected(null);await load()}}
 return <main className="w1-calendar-shell"><header className="w1-calendar-toolbar"><div><div className="reference-overline">PROJECTW1SC / GESTÃO OPERACIONAL</div><h1>Agenda</h1><p>Compromissos, retornos, tarefas e audiências futuras da carteira.</p></div><div className="w1-calendar-actions"><Link className="inf-btn" href="/prazos">Prazos e tarefas</Link><button className="inf-btn" type="button" onClick={load}><RefreshCw size={15}/> Atualizar</button><button className="inf-btn primary" type="button" onClick={()=>setEditing(x=>!x)}><Plus size={15}/> Novo compromisso</button></div></header>
 {error&&<p className="inf-note error" role="alert">{error}</p>}
 <section className="w1-calendar-panel"><div className="w1-calendar-toolbar"><div className="w1-calendar-month"><button className="inf-btn" type="button" onClick={()=>move(-1)} aria-label="Mês anterior"><ChevronLeft size={17}/></button><span>{new Date(first+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})}</span><button className="inf-btn" type="button" onClick={()=>move(1)} aria-label="Próximo mês"><ChevronRight size={17}/></button></div><div className="w1-calendar-actions"><button className="inf-btn" type="button" onClick={()=>setMonth(today().slice(0,7))}>Hoje</button><select aria-label="Exibir" value={filter} onChange={e=>setFilter(e.target.value)} className="inf-btn"><option value="abertos">Em aberto</option><option value="todos">Todos os status</option></select><button className={'inf-btn '+(view==='month'?'primary':'')} type="button" onClick={()=>setView('month')} aria-pressed={view==='month'}>Mês</button><button className={'inf-btn '+(view==='list'?'primary':'')} type="button" onClick={()=>setView('list')} aria-pressed={view==='list'}>Lista</button></div></div>
 {view==='month'?<><div className="w1-calendar-grid">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=><div className="w1-calendar-day-name" key={x}>{x}</div>)}</div><div className="w1-calendar-grid">{grid.map(day=><div className={'w1-calendar-day '+(day.slice(0,7)!==month?'outside':'')+' '+(day===today()?'today':'')} key={day}><div className="w1-calendar-day-number">{Number(day.slice(-2))}</div>{visible.filter(row=>row.due_on===day).slice(0,4).map(row=><button className="w1-calendar-event" type="button" key={row.id} onClick={()=>setSelected(row)} title={row.title} aria-pressed={selected?.id===row.id}>{kinds[row.kind]||'Compromisso'} · {row.title}</button>)}{visible.filter(row=>row.due_on===day).length>4&&<small>Mais {visible.filter(row=>row.due_on===day).length-4} itens</small>}</div>)}</div></>:<div className="w1-calendar-list">{visible.filter(x=>x.due_on>=first&&x.due_on<=last).map(row=><article key={row.id}><div><strong>{row.title}</strong><small>{dateName(row.due_on)} · {kinds[row.kind]||'Compromisso'} · {row.status}</small></div><button className="inf-btn" type="button" onClick={()=>setSelected(row)}>Detalhes</button></article>)}{!visible.some(x=>x.due_on>=first&&x.due_on<=last)&&<div className="inf-empty">Nenhum item para este mês.</div>}</div>}
 </section>
 {selected&&<section className="w1-calendar-editor"><div className="w1-calendar-toolbar"><h2>{selected.title}</h2><button className="inf-btn" type="button" onClick={()=>setSelected(null)}>Fechar</button></div><p>{dateName(selected.due_on)} · {kinds[selected.kind]} · Prioridade {selected.priority}</p>{selected.responsible&&<p>Responsável: {selected.responsible}</p>}{selected.notes&&<p>{selected.notes}</p>}{selected.status==='aberto'&&<button type="button" className="inf-btn primary" disabled={busy} onClick={()=>conclude(selected)}><CheckCircle2 size={15}/> Concluir</button>}</section>}
 {editing&&<form className="w1-calendar-editor" onSubmit={save}><h2>Novo compromisso</h2><label>Título<input value={form.title} required minLength={3} maxLength={250} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="form-row"><label>Data<input type="date" required value={form.due_on} onChange={e=>setForm({...form,due_on:e.target.value})}/></label><label>Tipo<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{Object.entries(kinds).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label><label>Prioridade<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option>normal</option><option>alta</option><option>urgente</option></select></label></div><label>Responsável<input maxLength={140} value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}/></label><label>Observações<textarea value={form.notes} maxLength={1500} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="w1-calendar-actions"><button className="inf-btn primary" disabled={busy}>Salvar compromisso</button><button className="inf-btn" type="button" onClick={()=>setEditing(false)}>Cancelar</button></div></form>}
 <p className="inf-note">Datas de audiências e prazos precisam ser conferidas em documentos oficiais. Audiências passadas não aparecem na agenda ativa. Nenhum contato é enviado automaticamente.</p>
 </main>;
}
export default function AgendaPage(){return <SecuredWorkspace active="Agenda">{({db,session})=>process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1'?<LexisOperations area="agenda" db={db} session={session}/>:<Agenda db={db} session={session}/>}</SecuredWorkspace>}
