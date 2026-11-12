'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Plus,RefreshCw,GripVertical,ArrowRight,Scale,CheckCircle2} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
const STAGES=[{key:'entrada',name:'Entrada',hint:'Novas demandas'}, {key:'triagem',name:'Triagem',hint:'Conferência inicial'}, {key:'producao',name:'Produção',hint:'Trabalho jurídico'}, {key:'revisao',name:'Revisão',hint:'Aprovação humana'}, {key:'concluido',name:'Concluído',hint:'Atividade encerrada'}];
function Board({db,session}){
 const [cards,setCards]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [notice,setNotice]=useState(''),[dragged,setDragged]=useState(''),[filter,setFilter]=useState('');
 const [adding,setAdding]=useState(false),[form,setForm]=useState({title:'',description:'',stage:'entrada',priority:'normal',card_type:'tarefa',due_on:'',assigned_to:''});
 const load=useCallback(async()=>{setLoading(true);
  const {data,error}=await db.from('office_workflow_cards').select('*').order('updated_at',{ascending:false}).limit(500);
  if(error)setNotice('Não foi possível acessar o fluxo: '+error.message);else setCards(data||[]);
  setLoading(false);
 },[db]);
 useEffect(()=>{load()},[load]);
 const columns=useMemo(()=>STAGES.map(stage=>({...stage,items:cards.filter(x=>x.stage===stage.key&&[x.title,x.description,x.assigned_to].some(z=>String(z||'').toLowerCase().includes(filter.toLowerCase())))})),[cards,filter]);
 async function add(e){e.preventDefault();setBusy(true);setNotice('');
  const row={title:form.title.trim(),description:form.description.trim(),stage:form.stage,priority:form.priority,card_type:form.card_type,
   due_on:form.due_on||null,assigned_to:form.assigned_to.trim()||null,owner_id:session.user.id};
  const {error}=await db.from('office_workflow_cards').insert(row);
  if(error)setNotice('Card não criado: '+error.message);else{setForm({title:'',description:'',stage:'entrada',priority:'normal',card_type:'tarefa',due_on:'',assigned_to:''});setAdding(false);setNotice('Card salvo no banco de dados.');await load()}
  setBusy(false);
 }
 async function move(id,stage){
  if(!STAGES.some(x=>x.key===stage)||busy)return;
  const card=cards.find(x=>x.id===id);if(!card||card.stage===stage)return;
  setBusy(true);setNotice('');
  const {data,error}=await db.from('office_workflow_cards')
   .update({stage,updated_at:new Date().toISOString()}).eq('id',id).select('id,stage').maybeSingle();
  if(error||!data)setNotice('Movimentação recusada: '+(error?.message||'sem autorização ou registro inexistente'));
  else{setCards(old=>old.map(x=>x.id===id?{...x,stage}:x));setNotice('Etapa atualizada e persistida: '+STAGES.find(x=>x.key===stage).name)}
  setDragged('');setBusy(false);
 }
 return <main className="inf-studio office-workflow-screen">
  <header className="inf-heading"><div><small>PROCEDIMENTOS · CONTROLADORIA JURÍDICA</small><h1>Fluxos e procedimentos</h1>
    <p>Organize tarefas por fase, mova cartões, acompanhe responsáveis e revisões. Alterações persistem no Supabase.</p></div>
   <div className="inf-actions"><button className="inf-btn" type="button" onClick={load} disabled={busy||loading}><RefreshCw size={15}/> Atualizar</button><button className="inf-btn primary" type="button" onClick={()=>setAdding(x=>!x)}><Plus size={15}/> Novo card</button></div>
  </header>
  {notice&&<p className="inf-note" role="status">{notice}</p>}
  <div className="office-workflow-tools"><input className="inf-search" aria-label="Filtrar tarefas" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar tarefa, fase ou responsável"/>
    <span className="office-hint">{cards.length} cartões registrados · Arraste ou use o botão Avançar</span></div>
  {adding&&<section className="inf-panel"><h2>Novo card jurídico</h2><form className="office-form-col" onSubmit={add}>
   <div className="inf-fields"><label>Título<input required minLength={3} maxLength={220} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Etapa<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{STAGES.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select></label>
    <label>Tipo<select value={form.card_type} onChange={e=>setForm({...form,card_type:e.target.value})}>{['tarefa','processo','peca','lead','outro'].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Prioridade<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{['normal','alta','urgente'].map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Data limite<input type="date" value={form.due_on} onChange={e=>setForm({...form,due_on:e.target.value})}/></label>
    <label>Responsável<input maxLength={140} value={form.assigned_to} onChange={e=>setForm({...form,assigned_to:e.target.value})}/></label>
    <label style={{gridColumn:'1/-1'}}>Detalhes<textarea maxLength={2000} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label></div>
    <button type="submit" className="inf-btn primary" disabled={busy}>Salvar no fluxo</button>
   </form></section>}
  <div className="office-kanban-columns" role="list" aria-label="Kanban jurídico">
   {columns.map((stage,idx)=><section key={stage.key} className="office-kanban-column" aria-label={stage.name} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain')||dragged;move(id,stage.key)}}>
    <header className="office-kanban-head"><span className={'office-phase-dot office-phase-'+stage.key}/><div><strong>{stage.name}</strong><small>{stage.hint}</small></div><b>{stage.items.length}</b></header>
    <div className="office-kanban-stack">{stage.items.map(x=><article className="office-kanban-card" key={x.id} draggable={!busy} onDragStart={e=>{setDragged(x.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',x.id)}}>
     <div className="office-kanban-line"><GripVertical size={13} aria-hidden="true"/><span>{x.card_type}</span><span className={'office-kanban-priority pr-'+x.priority}>{x.priority}</span></div>
     <strong>{x.title}</strong><p>{x.description?.slice(0,150)||'Sem descrição.'}</p><small>{x.assigned_to||'Sem responsável'} {x.due_on?' · '+x.due_on:''}</small>
     <div className="office-kanban-actions">{idx<STAGES.length-1&&<button className="inf-btn" type="button" disabled={busy} onClick={()=>move(x.id,STAGES[idx+1].key)}><ArrowRight size={13}/> Avançar</button>}
      {idx===STAGES.length-1&&<span className="office-hint"><CheckCircle2 size={13}/> Concluído</span>}</div>
    </article>)}{!stage.items.length&&<div className="office-kanban-empty">Solte um card aqui</div>}</div>
   </section>)}
  </div><div className="inf-note"><Scale size={14}/> Os procedimentos são próprios do escritório. A integração pública do Infinitum é de leitura e não replica dados automaticamente.</div>
 </main>;
}
export default function OfficeKanban(){return <SecuredWorkspace active="Fluxos (POP)">{({db,session})=><Board db={db} session={session}/>}</SecuredWorkspace>}
