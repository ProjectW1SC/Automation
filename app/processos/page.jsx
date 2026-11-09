'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Activity,AlertCircle,ArrowRight,CalendarDays,CheckCircle2,Clock3,ExternalLink,FileSearch,Gavel,History,Landmark,Loader2,Plus,RefreshCw,Search,ShieldCheck,Trash2} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import EfferdKpi from '../../components/efferd-kpi';
import {getClient} from '../../lib/supabase-client';
import {ADMIN_EMAIL,signInWithPassword} from '../../lib/login.mjs';
import {formatProcessNumber,mergeEvents} from '../../lib/processos-oficiais.mjs';
import {todayBrazil} from '../../lib/tarefas.mjs';
const formatDate=x=>x&&!Number.isNaN(Date.parse(x))?new Date(x).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'Data não informada';
const sourceLabels={datajud:'DataJud',djen:'DJEN'};
const twoYearsAgo=()=>{const d=new Date();d.setFullYear(d.getFullYear()-2);return d.toISOString().slice(0,10)};
function ProcessLogin({db,onSession}){
 const [pw,setPw]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <main className="reference-auth"><div className="reference-auth-card"><div className="reference-overline">PROJECTW1SC · ÁREA RESTRITA</div><h1>Processos</h1><p>Entre para consultar apenas os números CNJ salvos na sua carteira.</p>
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {session}=await signInWithPassword(db.auth,pw);setPw('');onSession(session)}catch(x){setError(x.message)}finally{setBusy(false)}}}>
  <input value={ADMIN_EMAIL} readOnly type="email" aria-label="E-mail da conta"/><input type="password" value={pw} minLength={8} required onChange={e=>setPw(e.target.value)} placeholder="Senha" autoComplete="current-password"/>
  <button className="reference-primary" disabled={busy}>Entrar</button>
 </form>{error&&<p role="alert">{error}</p>}<a href="/">Voltar ao CRM</a></div></main>;
}
function SourceStatus({source,status}){
 const label=sourceLabels[source];
 return <div className="processes-source"><strong>{source==='datajud'?<Landmark size={15}/>:<Gavel size={15}/>} {label}</strong>
  {status.state==='idle'?<span>Aguardando consulta</span>:status.state==='loading'?<span><Loader2 size={13} className="task-spin"/> Consultando a API oficial...</span>:
   status.state==='error'?<span className="error" role="alert">{status.error||'Fonte indisponível'}</span>:
   <span><CheckCircle2 size={13}/> Consulta concluída · {status.items.length} {source==='datajud'?'movimentações':'publicações'}<small>{formatDate(status.checkedAt)}</small>{status.notice&&<small>{status.notice}</small>}</span>}
 </div>;
}
const emptySource=()=>({state:'idle',items:[],checkedAt:null,notice:'',error:''});
export default function ProcessosPage(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[authLoading,setAuthLoading]=useState(true);
 const [saved,setSaved]=useState([]),[activityRecords,setActivityRecords]=useState([]),[clients,setClients]=useState([]);
 const [pageLoading,setPageLoading]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const [number,setNumber]=useState(''),[processType,setProcessType]=useState('comum'),[clientId,setClientId]=useState('');
 const [selected,setSelected]=useState(''),[search,setSearch]=useState(''),[tab,setTab]=useState('todas');
 const [start,setStart]=useState(twoYearsAgo()),[end,setEnd]=useState(todayBrazil());
 const [sourceStatus,setSourceStatus]=useState({datajud:emptySource(),djen:emptySource()});
 const requestId=useRef(0);
 useEffect(()=>{
  if(!db){setAuthLoading(false);return}
  let active=true;const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(active){setSession(s);setAuthLoading(false)}});
  db.auth.getSession().then(({data})=>{if(active){setSession(data.session);setAuthLoading(false)}}).catch(()=>setAuthLoading(false));
  return()=>{active=false;subscription.unsubscribe()}
 },[db]);
 const load=useCallback(async()=>{
  if(!db||session?.user?.email?.toLowerCase()!==ADMIN_EMAIL)return;
  setPageLoading(true);setNotice('');
  const [a,b,c]=await Promise.all([
   db.from('crm_processes').select('id,process_number,process_type,client_id,created_at').eq('actor_id',session.user.id).order('created_at',{ascending:false}).limit(1000),
   db.from('crm_completed_activities').select('id,process_number,process_type,client_id,performed_on').eq('actor_id',session.user.id).is('deleted_at',null).not('process_number','is',null).order('performed_on',{ascending:false}).limit(1000),
   db.from('crm_clients').select('id,name,institution').order('name').limit(1000)
  ]);
  const errors=[a,b,c].filter(x=>x.error).map(x=>x.error.message);
  if(errors.length)setNotice('Não foi possível carregar todos os registros: '+errors.join(' · '));
  setSaved(a.error?[]:a.data||[]);setActivityRecords(b.error?[]:b.data||[]);setClients(c.error?[]:c.data||[]);
  setPageLoading(false);
 },[db,session?.user?.id]);
 useEffect(()=>{if(session?.user?.id)load();else{setSaved([]);setActivityRecords([])}},[session?.user?.id,load]);
 const clientById=useMemo(()=>new Map(clients.map(c=>[c.id,c])),[clients]);
 const records=useMemo(()=>{
  const map=new Map();
  for(const a of activityRecords){
   if(!a.process_number)continue;
   const before=map.get(a.process_number)||{number:a.process_number,type:a.process_type||'comum',clientId:a.client_id||null,activityCount:0,savedId:null};
   before.activityCount++;if(!before.clientId)before.clientId=a.client_id||null;map.set(a.process_number,before);
  }
  for(const p of saved){
   const before=map.get(p.process_number)||{number:p.process_number,type:p.process_type||'comum',clientId:p.client_id||null,activityCount:0,savedId:null};
   before.savedId=p.id;before.type=p.process_type;before.clientId=p.client_id||before.clientId;map.set(p.process_number,before);
  }
  return [...map.values()].sort((a,b)=>a.number.localeCompare(b.number));
 },[saved,activityRecords]);
 const matching=useMemo(()=>records.filter(p=>[p.number,clientById.get(p.clientId)?.name].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim()))),[records,search,clientById]);
 const current=records.find(p=>p.number===selected);
 const merged=useMemo(()=>mergeEvents(sourceStatus.datajud.items,sourceStatus.djen.items),[sourceStatus]);
 const history=merged.filter(x=>tab==='todas'||x.source.toLowerCase()===tab);
 const loadingSources=sourceStatus.datajud.state==='loading'||sourceStatus.djen.state==='loading';
 async function addProcess(e){
  e.preventDefault();if(!db||saving)return;
  let formatted;try{formatted=formatProcessNumber(number)}catch(err){setNotice(err.message);return}
  setSaving(true);setNotice('');
  const {error}=await db.from('crm_processes').upsert({actor_id:session.user.id,process_number:formatted,process_type:processType,client_id:clientId||null},{onConflict:'actor_id,process_number'});
  if(error)setNotice('Cadastro não salvo: '+error.message);
  else{setNumber('');setProcessType('comum');setClientId('');await load();setSelected(formatted);setSourceStatus({datajud:emptySource(),djen:emptySource()});setNotice('Processo salvo. Clique em Consultar APIs oficiais para ver as movimentações.')}
  setSaving(false);
 }
 async function removeProcess(p){
  if(!p?.savedId||saving)return;
  if(!window.confirm('Remover este CNJ do cadastro manual? As atividades relacionadas continuarão intactas.'))return;
  setSaving(true);const {error}=await db.from('crm_processes').delete().eq('id',p.savedId).eq('actor_id',session.user.id);
  if(error)setNotice('Erro ao remover: '+error.message);else{await load();setNotice('Cadastro manual removido. Atividades preservadas.');if(p.number===selected){requestId.current++;setSelected('');setSourceStatus({datajud:emptySource(),djen:emptySource()})}}
  setSaving(false);
 }
 async function consult(){
  if(!current||loadingSources||!db)return;
  if(start>end){setNotice('A data inicial não pode ser posterior à final.');return}
  const {data:{session:fresh},error}=await db.auth.getSession();
  if(error||!fresh?.access_token){setNotice('Sua sessão expirou. Entre novamente.');return}
  const request=++requestId.current;setTab('todas');setNotice('');
  setSourceStatus({datajud:{...emptySource(),state:'loading'},djen:{...emptySource(),state:'loading'}});
  async function one(source){
   try{
    const url=new URL('/api/processos/consulta',window.location.origin);
    url.searchParams.set('numero',current.number);url.searchParams.set('fonte',source);
    if(source==='djen'){url.searchParams.set('inicio',start);url.searchParams.set('fim',end)}
    const resp=await fetch(url,{headers:{Authorization:'Bearer '+fresh.access_token},cache:'no-store'});
    const body=await resp.json();
    if(requestId.current!==request)return;
    setSourceStatus(old=>({...old,[source]:body.ok?{state:'ok',items:body.items||[],checkedAt:body.checkedAt||null,notice:body.notice||'',meta:body.meta,limited:body.limited,error:''}:
     {state:'error',items:[],error:body.error||'Fonte não respondeu.',checkedAt:null,notice:''}}));
   }catch(x){if(requestId.current===request)setSourceStatus(old=>({...old,[source]:{state:'error',items:[],error:'Erro de rede: '+x.message,checkedAt:null,notice:''}}))}
  }
  await Promise.all([one('datajud'),one('djen')]);
 }
 function choose(p){
  if(selected===p.number)return;
  requestId.current++;setSelected(p.number);setSourceStatus({datajud:emptySource(),djen:emptySource()});setTab('todas');
 }
 if(!db)return <main className="reference-auth">Supabase não configurado.</main>;
 if(authLoading)return <main className="reference-auth"><Loader2 size={20}/> Verificando sessão...</main>;
 if(!session)return <ProcessLogin db={db} onSession={setSession}/>;
 if(session.user.email?.toLowerCase()!==ADMIN_EMAIL)return <main className="reference-auth">Esta conta não tem acesso à carteira ProjectW1SC.</main>;
 const q=records.length,types=records.filter(p=>p.type==='busca_apreensao').length;
 return <CrmShell active="Processos" email={session.user.email} onSignOut={()=>db.auth.signOut()}>
 <main className="reference-dashboard processes-dashboard">
  <header className="reference-header"><div><div className="reference-overline">PROJECTW1SC · ACOMPANHAMENTO JUDICIAL</div><h1>Processos</h1><p>Números CNJ salvos e histórico de movimentações das APIs oficiais do CNJ.</p></div><div className="reference-actions"><button className="reference-outline" disabled={pageLoading} onClick={load}><RefreshCw size={15}/> Atualizar carteira</button><a className="reference-outline" href="/minhas-atividades"><Activity size={15}/> Minhas atividades</a></div></header>
  <div className="efferd-kpi-grid">
   <EfferdKpi icon={Gavel} title="Processos cadastrados" value={q} sub="Números CNJ distintos" tone="info"/>
   <EfferdKpi icon={FileSearch} title="Busca e apreensão" value={types} sub="Classificados no CRM" tone="warn"/>
   <EfferdKpi icon={History} title="Processos comuns" value={q-types} sub="Classificados no CRM" tone="ok"/>
   <EfferdKpi icon={ShieldCheck} title="Fontes oficiais" value="2" sub="DataJud e DJEN · consultas sob demanda" tone="default"/>
  </div>
  {notice&&<div role="status" className="reference-notice"><AlertCircle size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Fechar">×</button></div>}
  <div className="processes-grid">
   <section className="reference-panel processes-panel">
    <div className="reference-panel-title"><Gavel size={22}/><div><h2>Processos salvos</h2><p>Inclui os números registrados nas atividades.</p></div></div>
    <form className="processes-add-form" onSubmit={addProcess}>
     <label>Número CNJ<input aria-label="Número CNJ" required placeholder="0000000-00.0000.0.00.0000" value={number} onChange={e=>setNumber(e.target.value)} maxLength={32}/></label>
     <label>Tipo<select aria-label="Tipo de processo" value={processType} onChange={e=>setProcessType(e.target.value)}><option value="comum">Comum</option><option value="busca_apreensao">Busca e apreensão</option></select></label>
     <label>Cliente (opcional)<select aria-label="Cliente vinculado" value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Sem vínculo</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <button type="submit" className="reference-primary" disabled={saving}><Plus size={15}/> Salvar</button>
    </form>
    <label className="processes-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar número CNJ ou cliente"/></label>
    <div className="processes-list">{matching.map(p=><button type="button" key={p.number} onClick={()=>choose(p)} className={'processes-entry '+(p.number===selected?'active':'')}>
     <span><strong>{p.number}</strong><small>{p.type==='busca_apreensao'?'Busca e apreensão':'Processo comum'}{p.activityCount?' · '+p.activityCount+' atividades':''}</small><small>{clientById.get(p.clientId)?.name||'Sem cliente vinculado'}</small></span><ArrowRight size={16}/></button>)}
     {pageLoading&&<p>Carregando processos...</p>}
     {!pageLoading&&matching.length===0&&<div className="processes-empty"><FileSearch size={24}/><p>Nenhum número CNJ salvo nesta seleção. Cadastre um processo acima ou registre-o em Minhas atividades.</p></div>}
    </div>
   </section>
   <section className="reference-panel processes-panel">
    {!current?<div className="processes-empty"><Gavel size={28}/><h2>Selecione um processo</h2><p>Ao selecionar um CNJ, você poderá consultar as movimentações do DataJud e as publicações do DJEN.</p></div>:<>
     <div className="processes-head"><div><div className="reference-overline">HISTÓRICO PROCESSUAL</div><strong>{current.number}</strong><small>{current.type==='busca_apreensao'?'Busca e apreensão':'Processo comum'} · {clientById.get(current.clientId)?.name||'Sem vínculo'}</small></div><div className="processes-actions">
      {current.savedId&&<button type="button" className="reference-outline processes-delete" disabled={saving} onClick={()=>removeProcess(current)}><Trash2 size={14}/> Remover cadastro</button>}
      <button type="button" className="reference-primary" disabled={loadingSources} onClick={consult}>{loadingSources?<Loader2 size={15} className="task-spin"/>:<RefreshCw size={15}/>} Consultar APIs oficiais</button>
     </div></div>
     <div className="processes-date-filter"><label>Publicações DJEN desde<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Até<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label><small>DataJud consulta todas as movimentações públicas indexadas.</small></div>
     <div className="processes-source-states">
      <SourceStatus source="datajud" status={sourceStatus.datajud}/>
      <SourceStatus source="djen" status={sourceStatus.djen}/>
     </div>
     {sourceStatus.datajud.meta&&<div className="reference-notice"><Landmark size={15}/> {sourceStatus.datajud.meta.court||'Tribunal'} · {sourceStatus.datajud.meta.className||'Classe não informada'} · {sourceStatus.datajud.meta.courtUnit||'Órgão julgador não informado'}</div>}
     <div className="processes-timeline-heading"><h3>Histórico de movimentações</h3><div className="processes-tabs">{[['todas','Tudo'],['datajud','DataJud'],['djen','DJEN']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)} aria-pressed={tab===id}>{label}</button>)}</div></div>
     <div className="processes-timeline">{history.map((x,i)=><article className={'processes-movement '+(x.source==='DJEN'?'is-djen':'')} key={x.source+'-'+x.id+'-'+i}>
      <time dateTime={x.date||undefined}>{formatDate(x.date)}</time><h4>{x.title}</h4>{x.description&&<p>{x.description}</p>}<span className="source-tag">{x.source}</span>{x.link&&<div><a href={x.link} target="_blank" rel="noopener noreferrer">Ver publicação oficial <ExternalLink size={12}/></a></div>}
     </article>)}
     {history.length===0&&<div className="processes-empty"><Clock3 size={23}/><p>{loadingSources?'Consultando as fontes oficiais...':sourceStatus.datajud.state==='idle'&&sourceStatus.djen.state==='idle'?'Clique em Consultar APIs oficiais para carregar o histórico.':'Nenhuma movimentação retornada nos resultados disponíveis. Verifique o status de cada fonte acima.'}</p></div>}
     </div>
     {(sourceStatus.djen.limited||sourceStatus.datajud.items.length>=300)&&<p className="reference-notice">Há mais registros na fonte oficial. O painel mostra até 100 publicações DJEN e 300 movimentações DataJud por consulta.</p>}
    </>}
   </section>
  </div>
  <p style={{fontSize:11,color:'var(--ui-muted)',marginTop:17}}>Fontes: CNJ DataJud e Diário de Justiça Eletrônico Nacional. Resultados públicos podem ter atraso, exclusões de sigilo ou indisponibilidade. A consulta não altera o status do cliente.</p>
 </main>
 </CrmShell>;
}
