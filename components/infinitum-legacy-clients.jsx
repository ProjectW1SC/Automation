'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Archive,CheckCircle2,ClipboardList,Edit3,History,RefreshCw,Search,Users} from 'lucide-react';
const formatDate=x=>{if(!x)return '—';const day=String(x).slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)?day.slice(8)+'/'+day.slice(5,7)+'/'+day.slice(0,4):'—'};
const safe=x=>String(x??'').trim();
const formFrom=x=>({name:x.name||'',phone:x.phone||'',notes:x.notes||'',next_return:x.next_return||'',workflow_status:x.workflow_status||'ativo'});
const allowedStatus=new Set(['ativo','finalizado','arquivado']);
export default function InfinitumLegacyClients({db,profile,team=[]}){
 const [showArchived,setShowArchived]=useState(false),[clients,setClients]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState('');
 const [editing,setEditing]=useState(null),[form,setForm]=useState(null);
 const [selected,setSelected]=useState(null),[note,setNote]=useState(''),[date,setDate]=useState(''),[confirmed,setConfirmed]=useState(false),[history,setHistory]=useState([]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setBusy(true);
  try{
   const {data,error}=await db.from('crm_clients')
    .select('id,empresa_id,name,phone,doc_digits,notes,workflow_status,source_status,next_return,last_attendance_at,last_attended_by,created_at')
    .eq('empresa_id',profile.empresa_id).order('name',{ascending:true}).limit(250);
   if(error)throw Error(error.message);
   setClients(data||[]);
  }catch(e){setNotice('Não foi possível carregar os cadastros históricos: '+e.message)}
  finally{setBusy(false)}
 },[db,profile?.empresa_id]);
 useEffect(()=>{load()},[load]);
 const rows=useMemo(()=>clients.filter(c=>(showArchived||c.workflow_status!=='arquivado')&&[c.name,c.phone,c.doc_digits].some(x=>safe(x).toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))),[clients,search,showArchived]);
 const responsible=id=>team.find(u=>u.auth_user_id===id)?.nome||(id?'Responsável legado (identificador preservado)':'Não registrado');
 const edit=c=>{setEditing(c);setForm(formFrom(c));setSelected(null);setNotice('')};
 const save=async e=>{
  e.preventDefault();if(!editing||busy)return;
  if(form.name.trim().length<2){setNotice('Informe um nome válido.');return}
  if(form.next_return&&!/^\d{4}-\d{2}-\d{2}$/.test(form.next_return)){setNotice('Data inválida.');return}
  if(!allowedStatus.has(form.workflow_status)){setNotice('Situação inválida.');return}
  setBusy(true);
  try{
   const values={name:form.name.trim().slice(0,180),phone:safe(form.phone).slice(0,70)||null,
    notes:safe(form.notes).slice(0,4000)||null,next_return:form.next_return||null,workflow_status:form.workflow_status,updated_at:new Date().toISOString()};
   const {data,error}=await db.from('crm_clients').update(values).eq('id',editing.id).eq('empresa_id',profile.empresa_id).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Alteração não confirmada.');
   setEditing(null);setNotice('Cliente histórico atualizado sem apagar registros anteriores.');await load();
  }catch(err){setNotice('Edição não concluída: '+err.message)}finally{setBusy(false)}
 };
 const status=async(c,workflow_status)=>{
  if(busy||!allowedStatus.has(workflow_status))return;
  if(workflow_status==='arquivado'&&!window.confirm('Arquivar este cliente sem apagar o histórico?'))return;
  setBusy(true);
  try{
   const {data,error}=await db.from('crm_clients').update({workflow_status,updated_at:new Date().toISOString()}).eq('empresa_id',profile.empresa_id).eq('id',c.id).select('id').maybeSingle();
   if(error||!data?.id)throw Error(error?.message||'Registro não localizado');
   setNotice(workflow_status==='arquivado'?'Cliente removido da carteira ativa sem exclusão física.':workflow_status==='finalizado'?'Cliente encerrado internamente.':'Cliente mantido em andamento.');
   await load();
  }catch(e){setNotice('Situação não alterada: '+e.message)}finally{setBusy(false)}
 };
 const openAttendance=async c=>{
  setEditing(null);setSelected(c);setNote('');setDate(c.next_return||'');setConfirmed(false);setHistory([]);
  try{
   const {data,error}=await db.from('crm_activities')
    .select('id,kind,body,created_at,actor_id,details')
    .eq('client_id',c.id).eq('empresa_id',profile.empresa_id).order('created_at',{ascending:false}).limit(75);
   if(error)throw Error(error.message);
   setHistory(data||[]);
  }catch(e){setNotice('Histórico não disponível: '+e.message)}
 };
 const register=async e=>{
  e.preventDefault();if(busy||!selected)return;
  if(note.trim().length<3){setNotice('Descreva o atendimento.');return}
  setBusy(true);
  try{
   const {data,error}=await db.rpc('infinitum_registrar_atendimento_cliente',{p_cliente_id:selected.id,p_descricao:note.trim(),p_proximo_retorno:date||null,p_contato_confirmado:confirmed});
   if(error||data?.ok!==true)throw Error(error?.message||'Banco não confirmou o registro.');
   setNotice('Atendimento confirmado: '+data.responsavel+' · próximo retorno '+formatDate(data.proximo_atendimento));
   setSelected(null);await load();
  }catch(e){setNotice('Registro não confirmado: '+e.message)}finally{setBusy(false)}
 };
 return <section className="inf-panel" data-legacy-clients="preserved">
   <div className="inf-row-end" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
    <div><h2><Users size={18}/> Cadastros históricos do Infinitum</h2><p>Registros originais preservados; não são confundidos com os processos do LexisPredict.</p></div>
    <button className="inf-btn" onClick={load} disabled={busy}><RefreshCw size={16}/> Atualizar</button>
   </div>
   {notice&&<p className="inf-note" role="status">{notice}</p>}
   <label>Buscar cliente histórico <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome, telefone ou documento" aria-label="Pesquisar clientes do Infinitum"/></label>
   <label><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/> Incluir clientes arquivados (recuperação)</label><p>Exibindo {rows.length} de {clients.length} cadastros da organização.</p>
   <div className="office-records">{rows.map(c=><article className="office-record" key={c.id}>
     <strong>{c.name}</strong><p>{c.phone||'Telefone não informado'} · {c.doc_digits||'Documento não informado'}</p>
     <small>Último atendimento: {formatDate(c.last_attendance_at)} · Responsável: {responsible(c.last_attended_by)} · Próximo: {formatDate(c.next_return)} · Situação: {c.workflow_status||'ativo'}</small>
     <div className="inf-row-end" style={{justifyContent:'flex-start',gap:8,flexWrap:'wrap'}}>
       <button className="inf-btn" onClick={()=>edit(c)}><Edit3 size={14}/> Editar</button>
       <button className="inf-btn primary" onClick={()=>openAttendance(c)}><ClipboardList size={14}/> Registrar atendimento</button>
       {c.workflow_status!=='finalizado'&&<button className="inf-btn" onClick={()=>status(c,'finalizado')}><CheckCircle2 size={14}/> Encerrar</button>}
       {c.workflow_status!=='ativo'&&<button className="inf-btn" onClick={()=>status(c,'ativo')}>Em andamento</button>}
       {c.workflow_status!=='arquivado'&&<button className="inf-btn" onClick={()=>status(c,'arquivado')}><Archive size={14}/> Excluir da vista</button>}
     </div>
   </article>)}</div>
   {editing&&<form className="office-form-col" onSubmit={save}>
     <h3>Editar cliente histórico</h3>
     <div className="inf-fields">
      <label>Nome<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
      <label>Telefone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
      <label>Próximo atendimento<input type="date" value={form.next_return} onChange={e=>setForm({...form,next_return:e.target.value})}/></label>
      <label>Situação<select value={form.workflow_status} onChange={e=>setForm({...form,workflow_status:e.target.value})}><option value="ativo">Em andamento</option><option value="finalizado">Encerrado</option><option value="arquivado">Excluído da vista</option></select></label>
      <label style={{gridColumn:'1/-1'}}>Observações<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
     </div>
     <div className="inf-row-end"><button className="inf-btn primary" disabled={busy}>Salvar</button><button type="button" className="inf-btn" onClick={()=>setEditing(null)}>Cancelar</button></div>
   </form>}
   {selected&&<form className="office-form-col" onSubmit={register}>
    <h3><History size={16}/> Atendimento de {selected.name}</h3>
    <p>Responsável autenticado: {profile.nome}. O histórico anterior permanece preservado.</p>
    <div className="inf-fields">
      <label>Resumo do atendimento<textarea required minLength={3} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)}/></label>
      <label>Próximo retorno<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Contato com o cliente confirmado</label>
    </div>
    <div className="inf-row-end"><button className="inf-btn primary" disabled={busy}>Registrar atendimento</button><button type="button" className="inf-btn" onClick={()=>setSelected(null)}>Fechar</button></div>
    {history.length>0&&<div className="office-records">{history.map(a=><article className="office-record" key={a.id}><strong>{formatDate(a.created_at)} · {a.kind}</strong><p>{a.body}</p><small>{responsible(a.actor_id)}</small></article>)}</div>}
   </form>}
 </section>;
}
