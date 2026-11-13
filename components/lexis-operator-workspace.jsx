'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Activity,BookOpen,CheckCircle2,Clock,Download,Edit3,FileSearch,RefreshCw,Search,ShieldCheck,UserRound,Users,X} from 'lucide-react';
import {decorateLexisWork,normalizeCaseNumber} from '../lib/lexis-operator-data.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
import {toCsvCell} from '../lib/minhas-atividades.mjs';
import {likeTerm} from '../lib/lexis-shared-portfolio.mjs';
const LIMIT=25;
const format=x=>x?String(x).slice(0,10).split('-').reverse().join('/'):'Não informada';
const kindName=x=>String(x||'registro').replace(/_/g,' ').replace(/^./,y=>y.toUpperCase());
const CSV_CELL=x=>toCsvCell(x);
const labels={atividades:'Atividades',analises:'Análises internas'};
const initial=()=>({titulo:'',descricao:'',categoria:'analise_processual',data_realizacao:todayBrazil(),protocolo_ref:'',contato_cliente_confirmado:false});
export default function LexisOperatorWorkspace({area='atividades',db,session}){
 const [profile,setProfile]=useState(null),[team,setTeam]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [rows,setRows]=useState([]),[audit,setAudit]=useState([]),[count,setCount]=useState(0),[page,setPage]=useState(0),[search,setSearch]=useState(''),[draft,setDraft]=useState('');
 const [category,setCategory]=useState('todos'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [form,setForm]=useState(initial),[edit,setEdit]=useState(null),[openForm,setOpenForm]=useState(false);
 const isAnalyses=area==='analises';
 useEffect(()=>{let active=true;(async()=>{
  const {data,error:failure}=await db.from('usuarios').select('auth_user_id,empresa_id,nome').eq('auth_user_id',session.user.id).limit(2);
  if(!active)return;
  if(failure||data?.length!==1||!data[0]?.empresa_id||!data[0]?.nome){
   setError('Sua conta não possui vínculo único com a organização LexisPredict.');setLoading(false);return;
  }
  setProfile(data[0]);const people=await db.from('usuarios').select('auth_user_id,nome').eq('empresa_id',data[0].empresa_id).limit(250);
  if(active&&people.error)setError('Não foi possível carregar os responsáveis: '+people.error.message);
  if(active)setTeam(people.data||[]);
 })();return()=>{active=false}},[db,session.user.id]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setLoading(true);setError('');
  try{
   const table=isAnalyses?'registros_trabalho_analitico':'tarefas_realizadas';
   const cols=isAnalyses?'id,empresa_id,protocolo_ref,descricao,categoria,origem,data_atividade,responsavel_auth_user_id,responsavel_nome,nivel_conferencia,processo_id,contato_cliente_confirmado,created_at':
    'id,empresa_id,protocolo_ref,descricao,titulo,categoria,origem,data_realizacao,responsavel_auth_user_id,processo_id,contato_cliente_confirmado,created_at';
   const date=isAnalyses?'data_atividade':'data_realizacao';
   let q=db.from(table).select(cols,{count:'exact'}).eq('empresa_id',profile.empresa_id).eq('responsavel_auth_user_id',session.user.id);
   if(search)q=q.ilike('protocolo_ref',likeTerm(search));
   if(category!=='todos')q=q.eq('categoria',category);
   const work=q.order(date,{ascending:false}).order('created_at',{ascending:false}).range(page*LIMIT,page*LIMIT+LIMIT-1);
   const extra=isAnalyses?db.from('auditoria_logs_app').select('id,action,created_at,protocolo_ref').eq('empresa_id',profile.empresa_id).eq('auth_user_id',session.user.id).in('action',['edicao','atendimento']).order('created_at',{ascending:false}).limit(20):
    Promise.resolve({data:[],error:null});
   const [result,actions]=await Promise.all([work,extra]);
   if(result.error)throw result.error;
   setRows(decorateLexisWork(result.data||[],team));setCount(result.count??0);
   if(actions.error)setNotice('A auditoria não foi consultada: '+actions.error.message);
   else setAudit(actions.data||[]);
  }catch(e){setError('Consulta não concluída: '+String(e.message||e));setRows([])}
  finally{setLoading(false)}
 },[db,profile?.empresa_id,session.user.id,isAnalyses,page,search,category,team]);
 useEffect(()=>{load()},[load]);
 const pages=Math.max(1,Math.ceil(count/LIMIT));
 const categoryOptions=['todos','atendimento','analise_processual','auditoria','auditoria_documental','triagem_replica_provas','dossie','investigacao','investigacao_externa','sistema','automacao','outro'];
 const selectableCategories=isAnalyses?categoryOptions:categoryOptions.filter(x=>!['auditoria_documental','triagem_replica_provas','investigacao_externa'].includes(x));
 const save=async e=>{
  e.preventDefault();if(saving||isAnalyses||!profile?.empresa_id)return;
  const title=form.titulo.trim(),details=form.descricao.trim(),cnj=form.protocolo_ref.trim();
  if(title.length<4||title.length>180||details.length>3000){setError('Informe título de 4 a 180 caracteres e descrição de até 3.000.');return}
  const processNumber=cnj?normalizeCaseNumber(cnj):null;
  if(cnj&&!processNumber){setError('Informe o número CNJ completo, com 20 dígitos.');return}
  if(form.data_realizacao>todayBrazil()){setError('Não é possível registrar uma atividade futura como concluída.');return}
  if(form.contato_cliente_confirmado&&form.categoria!=='atendimento'){setError('Contato confirmado é permitido somente para atendimento real.');return}
  setSaving(true);setError('');setNotice('');
  try{
   let processId=null;
   if(processNumber){
    const {data:linked,error:findError}=await db.from('processos').select('id').eq('empresa_id',profile.empresa_id).eq('protocolo_ref',processNumber).limit(2);
    if(findError)throw findError;
    if(linked?.length!==1)throw Error('Processo não localizado de forma única na empresa; não foi criado vínculo presumido.');
    processId=linked[0].id;
   }
   const payload={titulo:title,descricao:details,categoria:form.categoria,data_realizacao:form.data_realizacao,
    protocolo_ref:processNumber,processo_id:processId,contato_cliente_confirmado:form.contato_cliente_confirmado&&form.categoria==='atendimento',
    origem:'infinitum_manual'};
   const table=db.from('tarefas_realizadas');
   const result=edit?await table.update(payload).eq('id',edit.id).eq('empresa_id',profile.empresa_id).eq('responsavel_auth_user_id',session.user.id).eq('origem','infinitum_manual').select('id').maybeSingle():
    await table.insert({...payload,empresa_id:profile.empresa_id,responsavel_auth_user_id:session.user.id}).select('id').maybeSingle();
   if(result.error||!result.data?.id)throw Error(result.error?.message||'O banco não confirmou a alteração.');
   setOpenForm(false);setEdit(null);setForm(initial());setNotice(edit?'Atividade atualizada.':'Atividade registrada pelo seu login LexisPredict.');
   setPage(0);await load();
  }catch(err){setError('Não foi possível salvar: '+String(err.message||err))}
  finally{setSaving(false)}
 };
 const startEdit=x=>{if(x.origem!=='infinitum_manual')return;setEdit(x);setOpenForm(true);
  setForm({titulo:x.titulo||'',descricao:x.descricao||'',categoria:x.categoria||'outro',
   data_realizacao:x.data_realizacao||todayBrazil(),protocolo_ref:x.protocolo_ref||'',contato_cliente_confirmado:x.contato_cliente_confirmado===true});
  window.scrollTo({top:0,behavior:'smooth'});
 };
 const csv=()=>{
  const headers=['Data','Tipo','Título','Descrição','Processo','Responsável','Fonte','Contato confirmado'];
  const records=rows.map(x=>[x.data_atividade||x.data_realizacao,kindName(x.categoria),x.titulo||'',x.descricao||'',x.protocolo_ref||'',x.responsible,x.origem||'',x.contactConfirmed?'Sim':'Não']);
  const content='\uFEFF'+[headers,...records].map(x=>x.map(CSV_CELL).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='infinitum-'+area+'.csv';a.click();URL.revokeObjectURL(url);
 };
 return <main className="inf-studio" data-lexis-operator={area}>
  <header className="reference-header"><div><span className="reference-overline">INFINITUM · LEXISPREDICT / MEU TRABALHO</span>
    <h1>{labels[area]||'Atividades'}</h1><p>{isAnalyses?'Auditorias, análises, verificações e ações atribuídas ao seu login.':'Registro, revisão e histórico das atividades realizadas por você.'}</p></div>
   <div className="reference-actions"><button type="button" className="inf-btn" disabled={loading} onClick={load}><RefreshCw size={15}/> Atualizar</button>
    <button type="button" className="inf-btn" disabled={!rows.length} onClick={csv}><Download size={15}/> Exportar página</button>
    {!isAnalyses&&<button type="button" className="inf-btn primary" onClick={()=>{setEdit(null);setForm(initial());setOpenForm(v=>!v)}}>Nova atividade</button>}</div></header>
  {error&&<p role="alert" className="inf-note error">{error}</p>}{notice&&<p role="status" className="inf-note">{notice}</p>}
  <div className="inf-grid">
   <div className="inf-stat"><label>Meus registros</label><strong>{count.toLocaleString('pt-BR')}</strong></div>
   <div className="inf-stat"><label>Registros nesta página</label><strong>{rows.length}</strong></div>
   <div className="inf-stat"><label>Responsável</label><strong style={{fontSize:16}}>{profile?.nome||'Verificando acesso'}</strong></div>
   <div className="inf-stat"><label>Empresa</label><strong style={{fontSize:15}}>Dados separados por organização</strong></div>
  </div>
  {openForm&&!isAnalyses&&<section className="inf-panel" aria-label="Registrar atividade"><div className="reference-panel-title"><Edit3 size={18}/><h2>{edit?'Editar atividade manual':'Registrar atividade'}</h2></div>
   <p>Somente atividades efetivamente realizadas. O registro mantém o responsável autenticado.</p>
   <form className="lx-operator-form" onSubmit={save}>
    <label>Título<input required minLength={4} maxLength={180} value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})}/></label>
    <label>Data<input required type="date" max={todayBrazil()} value={form.data_realizacao} onChange={e=>setForm({...form,data_realizacao:e.target.value})}/></label>
    <label>Categoria<select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value,contato_cliente_confirmado:false})}>{selectableCategories.filter(x=>x!=='todos').map(x=><option key={x} value={x}>{kindName(x)}</option>)}</select></label>
    <label>Número CNJ (opcional)<input value={form.protocolo_ref} onChange={e=>setForm({...form,protocolo_ref:e.target.value})} placeholder="0000000-00.0000.0.00.0000"/></label>
    <label className="full">Descrição<textarea maxLength={3000} rows={3} value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})}/></label>
    <label className="full"><input type="checkbox" disabled={form.categoria!=='atendimento'} checked={form.contato_cliente_confirmado} onChange={e=>setForm({...form,contato_cliente_confirmado:e.target.checked})}/> Houve contato real com o cliente</label>
    <div className="reference-actions full"><button type="submit" disabled={saving} className="inf-btn primary">{saving?'Salvando...':edit?'Salvar alteração':'Registrar atividade'}</button><button type="button" className="inf-btn" onClick={()=>{setOpenForm(false);setEdit(null)}}><X size={14}/> Cancelar</button></div>
   </form>
  </section>}
  <section className="inf-panel"><div className="reference-panel-title"><BookOpen size={19}/><div><h2>Histórico do responsável</h2><p>Dados originais do LexisPredict — sem registros fictícios.</p></div></div>
   <form className="lx-operator-filters" onSubmit={e=>{e.preventDefault();setSearch(draft.trim());setPage(0)}}>
    <label className="lx-operator-search"><Search size={15}/><input aria-label="Buscar número de processo" placeholder="Filtrar pelo número do processo" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <select aria-label="Filtrar categoria" value={category} onChange={e=>{setCategory(e.target.value);setPage(0)}}>{selectableCategories.map(x=><option key={x} value={x}>{x==='todos'?'Todas as categorias':kindName(x)}</option>)}</select>
    <button className="inf-btn primary" type="submit">Buscar</button><button className="inf-btn" type="button" onClick={()=>{setSearch('');setDraft('');setPage(0);setCategory('todos')}}>Limpar</button>
   </form>
   {loading&&<p className="inf-note">Carregando registros...</p>}
   {!loading&&rows.length===0&&<div className="reference-empty"><FileSearch size={22}/><p>Nenhum registro localizado nesta seleção. Isso não indica ausência de atividades de outros responsáveis.</p></div>}
   <div className="lx-operator-list">{rows.map(item=><article className="lx-operator-record" key={item.id}>
    <div className="lx-operator-record-top"><span className="reference-overline">{format(item.data_atividade||item.data_realizacao)} · {kindName(item.categoria)}</span>{item.contactConfirmed&&<span className="lx-status lx-status--em_dia">Contato confirmado</span>}</div>
    <h3>{item.titulo||kindName(item.categoria)}</h3>
    {item.descricao&&<p>{item.descricao}</p>}
    <small>Responsável: <strong>{item.responsible}</strong> · Origem: {item.origem||'Não informada'}{item.nivel_conferencia?' · Conferência: '+item.nivel_conferencia:''}</small>
    <div className="reference-actions">{item.protocolo_ref&&<Link className="inf-btn" href={'/consulta-judicial?numero='+encodeURIComponent(item.protocolo_ref)}><FileSearch size={14}/> Histórico judicial · {item.protocolo_ref}</Link>}
     {!isAnalyses&&item.origem==='infinitum_manual'&&<button className="inf-btn" type="button" onClick={()=>startEdit(item)}><Edit3 size={14}/> Editar</button>}
    </div>
   </article>)}</div>
   <div className="lx-operator-pagination"><span>{count.toLocaleString('pt-BR')} registros · Página {page+1} de {pages}</span>
    <div className="reference-actions"><button className="inf-btn" type="button" disabled={page===0||loading} onClick={()=>setPage(x=>x-1)}>Anterior</button>
    <button className="inf-btn" type="button" disabled={page+1>=pages||loading} onClick={()=>setPage(x=>x+1)}>Próxima</button></div></div>
  </section>
  {isAnalyses&&<section className="inf-panel"><div className="reference-panel-title"><ShieldCheck size={19}/><div><h2>Últimas ações operacionais</h2><p>Edições e atendimentos registrados no histórico de auditoria.</p></div></div>
   <div className="lx-operator-list">{audit.map(a=><div className="lx-operator-record" key={a.id}><strong>{a.action==='atendimento'?'Atendimento registrado':'Edição no sistema'}</strong><p>{format(a.created_at)} · {a.protocolo_ref||'Sem CNJ identificado'}</p></div>)}{!audit.length&&<p className="inf-note">Nenhuma ação localizada no recorte consultado.</p>}</div>
  </section>}
 </main>;
}
