'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Plus,Upload,RefreshCw,Table2,Columns3,Search,ExternalLink} from 'lucide-react';
import SecuredWorkspace from '../../components/secured-workspace';
import {LEAD_SOURCES,LEAD_STAGES,normalizeLead,parseLeadImport} from '../../lib/lead-fusion.mjs';
const empty=()=>({name:'',company:'',email:'',phone:'',source:'manual',source_url:'',interest:'',source_detail:'',score:'0',stage:'novo'});
const stamp=t=>t?new Date(t).toLocaleDateString('pt-BR'):'—';
function LeadsBoard({db,session}){
 const [items,setItems]=useState([]),[intake,setIntake]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [form,setForm]=useState(empty()),[showForm,setShowForm]=useState(false);
 const [visibleCount,setVisibleCount]=useState(100);
 const [filter,setFilter]=useState(''),[origin,setOrigin]=useState('todos'),[view,setView]=useState('tabela'),[importSource,setImportSource]=useState('w1');
 const load=useCallback(async()=>{
  setBusy(true);
  const [r,q]=await Promise.all([
   db.from('crm_leads').select('id,name,company,phone,email,source,source_key,source_url,source_detail,interest,stage,score,created_at,updated_at')
    .order('created_at',{ascending:false}).limit(1000),
   db.from('office_intake').select('id,name,email,phone,practice_area,message,consent_at,created_at,converted_at')
    .order('created_at',{ascending:false}).limit(100)
  ]);
  if(r.error)setNotice('Falha ao consultar Leads: '+r.error.message);else setItems(r.data||[]);
  if(q.error)setNotice('Falha ao consultar solicitações do site: '+q.error.message);else setIntake(q.data||[]);
  setBusy(false)
 },[db]);
 useEffect(()=>{load()},[load]);
 const results=useMemo(()=>items.filter(x=>(origin==='todos'||x.source===origin)&&
  (x.name+' '+(x.company||'')+' '+(x.interest||'')).toLocaleLowerCase('pt-BR').includes(filter.toLocaleLowerCase('pt-BR'))),[items,filter,origin]);
 const visible=results.slice(0,visibleCount);
 const count=stage=>items.filter(x=>x.stage===stage).length;
 async function add(e){
  e.preventDefault();setBusy(true);
  try{
   const lead=normalizeLead(form,form.source);
   const r=await db.from('crm_leads').upsert({...lead,owner_id:session.user.id,updated_at:new Date().toISOString()},{onConflict:'source_key'});
   if(r.error)throw r.error;
   setForm(empty());setShowForm(false);setNotice('Lead salvo na carteira com origem registrada.');
   await load()
  }catch(error){setNotice('Cadastro não concluído: '+error.message)}
  finally{setBusy(false)}
 }
 async function move(id,stage){
  const r=await db.from('crm_leads').update({stage,updated_at:new Date().toISOString()}).eq('id',id);
  if(r.error)setNotice('Não foi possível atualizar o lead: '+r.error.message);
  else setItems(list=>list.map(x=>x.id===id?{...x,stage}:x))
 }
 async function importIntake(row){
  setBusy(true);setNotice('');
  try{
   const lead=normalizeLead({name:row.name,email:row.email,phone:row.phone,source_detail:row.message||'Solicitação voluntária do site',
    interest:row.practice_area,consent_at:String(row.consent_at||'').slice(0,10),consent_source:'formulario_publico',status:'novo'},'manual');
   const r=await db.from('crm_leads').upsert({...lead,owner_id:session.user.id,updated_at:new Date().toISOString()},{onConflict:'source_key'});
   if(r.error)throw r.error;
   const x=await db.from('office_intake').update({converted_at:new Date().toISOString()}).eq('id',row.id);
   if(x.error)throw x.error;
   setNotice('Solicitação recebida do site transferida para o funil, sem enviar mensagens automaticamente.');
   await load()
  }catch(e){setNotice('Não foi possível transferir o lead: '+e.message)}finally{setBusy(false)}
 }
 async function importFile(e){
  const file=e.currentTarget.files?.[0];if(!file)return;
  if(file.size>2_000_000){setNotice('Arquivo acima do limite de 2 MB. Divida em lotes.');return}
  setBusy(true);
  try{
   const data=parseLeadImport(await file.text(),file.name,importSource);
   if(!data.valid.length)throw new Error('Nenhum registro válido. '+data.errors.slice(0,3).join(' | '));
   let saved=0;
   for(let i=0;i<data.valid.length;i+=50){
    const part=data.valid.slice(i,i+50).map(x=>({...x,owner_id:session.user.id,updated_at:new Date().toISOString()}));
    const r=await db.from('crm_leads').upsert(part,{onConflict:'source_key'});
    if(r.error)throw new Error('Lote '+(i/50+1)+': '+r.error.message);
    saved+=part.length;
   }
   setNotice(saved+' leads importados/atualizados. '+data.errors.length+' linhas rejeitadas por falta de identificação.');
   await load()
  }catch(error){setNotice('Importação interrompida: '+error.message)}
  finally{e.target.value='';setBusy(false)}
 }
 return <main className="inf-studio">
  <header className="inf-heading"><div><small>CRM / W1 CAPITAL / CAPTAÇÃO</small><h1>Leads</h1>
   <p>Captação jurídica: solicitações voluntárias pelo site e importação de contatos autorizados W1/W2. Sem envio automático de mensagens.</p></div>
   <div className="inf-actions"><button className="inf-btn" onClick={load} disabled={busy}><RefreshCw size={15}/> Atualizar</button><button className="inf-btn primary" onClick={()=>setShowForm(x=>!x)}><Plus size={15}/> Novo lead</button></div></header>
  <div className="inf-grid">
   <div className="inf-stat"><label>Leads da carteira</label><strong>{items.length}</strong></div>
   <div className="inf-stat"><label>Qualificados</label><strong>{count('qualificado')}</strong></div>
   <div className="inf-stat"><label>Propostas</label><strong>{count('proposta')}</strong></div>
   <div className="inf-stat"><label>Convertidos</label><strong>{count('convertido')}</strong></div>
  </div>
  {notice&&<div className={'inf-note '+(/falha|interromp|erro|rejeitad|não foi/i.test(notice)?'error':'')} role="status">{notice}</div>}
  <section className="inf-panel"><div className="office-toolbar"><h2>Solicitações pela landing page jurídica</h2><a className="inf-btn primary" href="/captacao" target="_blank" rel="noreferrer">Abrir página de captação <ExternalLink size={12}/></a></div>
   <p>Contato recebido com autorização de retorno e validação antispam. Revise antes de enviar ao funil.</p>
   <div className="office-records">{intake.filter(x=>!x.converted_at).map(x=><article className="office-record" key={x.id}>
    <strong>{x.name}</strong><p>{x.practice_area} · {x.email||x.phone||'Sem contato'} · {stamp(x.created_at)}</p>
    <p>{x.message||'Sem descrição'}</p><button type="button" className="inf-btn" disabled={busy} onClick={()=>importIntake(x)}>Adicionar ao funil</button>
   </article>)}{!intake.some(x=>!x.converted_at)&&<div className="office-list-empty">Nenhum pedido de contato pendente do site.</div>}</div>
  </section>
  <section className="inf-panel"><h2>Fontes e geradores conectados ao fluxo</h2>
   <p>W1 Leadcheck exporta CSV; W2 LEADCHECKIN exporta dados CSV/JSON. W3 God’s Eye é uma ferramenta geográfica, não uma API de geração automática de leads.</p>
   <div className="inf-source-row">{LEAD_SOURCES.filter(s=>s.href).map(x=><a key={x.id} href={x.href} target="_blank" rel="noreferrer">{x.label} <ExternalLink size={11}/></a>)}</div>
   <div className="inf-toolbar"><label className="inf-field">Origem do arquivo<select value={importSource} onChange={e=>setImportSource(e.target.value)}>{LEAD_SOURCES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   <label className="inf-field">Importar CSV ou JSON<input type="file" accept=".csv,.json,text/csv,application/json" onChange={importFile} disabled={busy}/></label></div>
   <p>Somente dados obtidos de forma autorizada. Não presume consentimento para mensagens e não envia contatos automaticamente.</p>
  </section>
  {showForm&&<section className="inf-panel"><h2>Adicionar lead</h2><form onSubmit={add}>
   <div className="inf-fields">
    <label>Nome ou título<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Empresa<input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></label>
    <label>Fonte<select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{LEAD_SOURCES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    <label>E-mail<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
    <label>Telefone público/autorizado<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
    <label>URL de origem<input type="url" value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})}/></label>
    <label>Interesse<input value={form.interest} onChange={e=>setForm({...form,interest:e.target.value})}/></label>
    <label>Score (0–100)<input type="number" min="0" max="100" value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/></label>
    <label>Etapa<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{LEAD_STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label style={{gridColumn:'1/-1'}}>Observação / evidência<textarea value={form.source_detail} onChange={e=>setForm({...form,source_detail:e.target.value})}/></label>
   </div><div className="inf-row-end"><button type="button" className="inf-btn" onClick={()=>setShowForm(false)}>Cancelar</button><button disabled={busy} className="inf-btn primary">Salvar lead</button></div>
  </form></section>}
  <section className="inf-panel"><div className="inf-toolbar"><input className="inf-search" placeholder="Buscar lead, empresa ou interesse..." value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Buscar leads"/>
   <select aria-label="Filtrar por origem" className="inf-search" style={{maxWidth:180}} value={origin} onChange={e=>setOrigin(e.target.value)}><option value="todos">Todas as fontes</option>{LEAD_SOURCES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
   <div className="inf-tabs"><button aria-pressed={view==='tabela'} onClick={()=>setView('tabela')}><Table2 size={14}/> Tabela</button><button aria-pressed={view==='kanban'} onClick={()=>setView('kanban')}><Columns3 size={14}/> Kanban</button></div></div>
   {!results.length?<div className="inf-empty">Nenhum lead nesta visualização. Cadastre ou importe registros reais.</div>:
   view==='kanban'?<div className="inf-kanban">{LEAD_STAGES.map(stage=><div key={stage} className="inf-kanban-col"><div className="inf-kanban-header"><span>{stage}</span><span>{visible.filter(x=>x.stage===stage).length}</span></div>
    {visible.filter(x=>x.stage===stage).map(x=><article key={x.id} className="inf-kanban-card"><strong>{x.name}</strong><p>{x.company||'Sem organização'} · {x.source.toUpperCase()}</p><p>Score {x.score}</p>
      <select aria-label={'Etapa de '+x.name} value={x.stage} onChange={e=>move(x.id,e.target.value)}>{LEAD_STAGES.map(s=><option key={s}>{s}</option>)}</select>
     </article>)}</div>)}</div>:
   <div className="inf-table-wrap"><table className="inf-table"><thead><tr><th>Lead</th><th>Empresa</th><th>Fonte</th><th>Contato</th><th>Score</th><th>Etapa</th><th>Registrado</th></tr></thead><tbody>
    {visible.map(x=><tr key={x.id}><td><strong>{x.name}</strong>{x.source_url&&<div><a href={x.source_url} target="_blank" rel="noreferrer">Origem pública <ExternalLink size={11}/></a></div>}</td>
     <td>{x.company||'—'}</td><td><span className="inf-badge">{x.source.toUpperCase()}</span></td>
     <td>{x.email||x.phone||'Não informado'}</td><td>{x.score}</td><td><select aria-label={'Etapa de '+x.name} value={x.stage} onChange={e=>move(x.id,e.target.value)}>{LEAD_STAGES.map(s=><option key={s}>{s}</option>)}</select></td><td>{stamp(x.created_at)}</td></tr>)}
    </tbody></table></div>}
   {visible.length<results.length&&<div className="inf-row-end"><button type="button" className="inf-btn" onClick={()=>setVisibleCount(n=>Math.min(n+100,1000))}>Mostrar mais {Math.min(100,results.length-visible.length)} leads</button></div>}
   {items.length>=1000&&<p>Consulta limitada aos mil registros mais recentes; filtros e paginação adicionais podem ser necessários.</p>}
  </section>
 </main>;
}
export default function LeadsPage(){return <SecuredWorkspace active="Leads">{({db,session})=><LeadsBoard db={db} session={session}/>}</SecuredWorkspace>}
