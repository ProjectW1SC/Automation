'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {RefreshCw,Plus,Search,FileText,CalendarDays,ShieldCheck,MessageSquare,Users,BriefcaseBusiness,Clock3,ExternalLink,Download,Bot,CheckCircle2,Scale,Headset,Filter} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import PrestigeDashboard from './prestige-dashboard';
import {PrestigeClients,PrestigeCases} from './prestige-office-lists';
import BlackholeHermesAgent from './blackhole-hermes-agent';
import BlackholeOfficialHearings from './blackhole-official-hearings';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
import {makeStandalonePetition} from '../lib/blackhole-petitions.mjs';
import {blackholeWhatsAppWebUrl} from '../lib/blackhole-whatsapp-web.mjs';
import {OFFICE_AGENTS,OFFICE_DOC_TYPES,normalizeOfficeCNJ,validateOfficeDay,deadlineState,officeMiniReview,makePetitionSkeleton,buildWhatsAppSuggestion,canReplyWhatsApp} from '../lib/office-core.mjs';
const TABLES={clients:'office_clients',cases:'office_cases',deadlines:'office_deadlines',documents:'office_documents',messages:'office_whatsapp_messages',leads:'crm_leads',runs:'office_agent_runs'};
const LOADED={
 dashboard:['clients','cases','deadlines','leads','messages','runs'],
 clients:['clients','cases'],
 cases:['clients','cases'],
 deadlines:['clients','cases','deadlines'],
 audiencias:['clients','cases','deadlines'],
 documents:['clients','cases','documents'],
 whatsapp:['clients','messages'],
 agents:['clients','cases','deadlines','leads','messages','runs'],
 reports:['clients','cases','deadlines','leads','messages','runs']
};
const titleMap={dashboard:'Painel jurídico',clients:'Clientes',cases:'Processos',deadlines:'Prazos',audiencias:'Audiências',documents:'Peças e petições',whatsapp:'WhatsApp',agents:'Mini Agentes',reports:'Relatórios'};
const emptyClient=()=>({name:'',phone:'',email:'',document:'',notes:'',responsible:'',next_return:''});
const emptyCase=()=>({title:'',process_number:'',client_id:'',tribunal:'',subject:'',lawyer:'',next_review:'',notes:''});
const emptyDeadline=()=>({title:'',due_on:'',kind:'prazo',case_id:'',client_id:'',priority:'normal',verified:false,source:'',source_url:'',responsible:'',notes:''});
const dateLabel=d=>{if(!d)return'—';const s=String(d).slice(0,10).split('-');return s.length===3?s.reverse().join('/'):String(d)};
const display=(v,fallback='—')=>String(v||fallback);
const safeText=(x,n=300)=>String(x||'').slice(0,n);
function Source({children}){return <p className="inf-note">{children}</p>}
function Stat({label,value,href,description}){return <Link href={href} className="inf-stat" style={{textDecoration:'none'}}><label>{label}</label><strong>{value}</strong>{description&&<small className="office-hint">{description}</small>}</Link>}
function OfficeUI({area,db,session}){
 const [data,setData]=useState({clients:[],cases:[],deadlines:[],documents:[],messages:[],leads:[],runs:[]});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [showForm,setShowForm]=useState(false),[query,setQuery]=useState('');
 const [client,setClient]=useState(emptyClient()),[caseForm,setCaseForm]=useState(emptyCase()),[deadlineForm,setDeadlineForm]=useState(emptyDeadline());
 const [editClientId,setEditClientId]=useState(null),[editCaseId,setEditCaseId]=useState(null),[editDeadlineId,setEditDeadlineId]=useState(null);
 const [selectedCase,setSelectedCase]=useState(''),[consulting,setConsulting]=useState(''),[checkResult,setCheckResult]=useState(null);
 const [docKind,setDocKind]=useState('manifestacao'),[docInstructions,setDocInstructions]=useState(''),[docResult,setDocResult]=useState(null),[useAi,setUseAi]=useState(false),[showPreview,setShowPreview]=useState(true);
 const [selectedPhone,setSelectedPhone]=useState(''),[reply,setReply]=useState(''),[whatsappStatus,setWhatsappStatus]=useState(null);
 const [webPhone,setWebPhone]=useState(''),[webText,setWebText]=useState('');
 const [showManualWeb,setShowManualWeb]=useState(false);
 const [miniResult,setMiniResult]=useState(null),[deadlineFilter,setDeadlineFilter]=useState('abertos');
 const [agentSearch,setAgentSearch]=useState(''),[agentFilter,setAgentFilter]=useState('todos');
 const need=LOADED[area]||LOADED.dashboard;
 const load=useCallback(async()=>{
  setLoading(true);
  let entries;
 try{entries=await withAuthDeadline(Promise.all(need.map(async key=>{
   const limit=key==='deadlines'?600:key==='messages'?350:key==='clients'||key==='cases'?500:200;
   const sort=key==='deadlines'?'due_on':key==='clients'?'name':key==='cases'?'updated_at':'created_at';
   const res=await db.from(TABLES[key]).select('*').order(sort,{ascending:key==='clients'||key==='deadlines'}).limit(limit);
   return {key,res}
  })),12000)}catch(e){setNotice('Falha ao carregar: '+e.message+' Atualize para tentar novamente.');setLoading(false);return}
  setData(old=>({...old,...Object.fromEntries(entries.map(({key,res})=>[key,res.data||[]]))}));
  const problems=entries.filter(({res})=>res.error);
  if(problems.length)setNotice('Não foi possível acessar: '+problems.map(x=>x.key+': '+x.res.error.message).join(' · '));
  setLoading(false);
 },[db,area]);
 useEffect(()=>{load()},[load]);
 const clients=data.clients,cases=data.cases,deadlines=data.deadlines,documents=data.documents,messages=data.messages,leads=data.leads,runs=data.runs;
 const getClientName=id=>clients.find(x=>x.id===id)?.name||'Cliente não vinculado';
 const getCaseTitle=id=>cases.find(x=>x.id===id)?.title||'Sem processo';
 const mini=useMemo(()=>officeMiniReview({clients,cases,deadlines,leads,messages}),[clients,cases,deadlines,leads,messages]);
 const match=(values)=>values.some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
 const act=async(op,success)=>{
  setBusy(true);setNotice('');
  try{await op();setNotice(success);await load();setShowForm(false);return true}
  catch(e){setNotice('Operação não concluída: '+(e.message||String(e)));return false}
  finally{setBusy(false)}
 };
 const save=(table,row)=>async()=>{const r=await db.from(table).insert(row);if(r.error)throw r.error;};
 useEffect(()=>{if(area==='documents')setSelectedCase(new URLSearchParams(window.location.search).get('case')||'')},[area]);
 async function createClient(e){e.preventDefault();
  if(busy)return;
  const name=String(client.name||'').trim();
  if(name.length<2||name.length>180){setNotice('Informe nome de cliente entre 2 e 180 caracteres.');return}
  const row={owner_id:session.user.id,name,phone:String(client.phone||'').trim()||null,email:String(client.email||'').trim()||null,document:String(client.document||'').trim()||null,
   notes:String(client.notes||'').trim()||null,responsible:String(client.responsible||'').trim()||null,next_return:client.next_return||null};
  if(editClientId)row.status=client.status||'ativo';
  const saved=await act(async()=>{
   const r=editClientId?await db.from('office_clients').update({...row,updated_at:new Date().toISOString()}).eq('id',editClientId).select('id,name').maybeSingle():
    await db.from('office_clients').insert(row).select('id,name').single();
   if(r.error)throw Error(r.error.message+(r.error.code?' (código '+r.error.code+')':''));
   if(!r.data?.id)throw Error('O banco não confirmou a gravação. O formulário foi preservado.');
  },editClientId?'Cadastro jurídico atualizado e confirmado.':'Cliente jurídico criado e confirmado no banco.');
  if(saved){setClient(emptyClient());setEditClientId(null)}
 }
 async function createCase(e){e.preventDefault();let number;
  try{number=normalizeOfficeCNJ(caseForm.process_number)}catch(e){setNotice(e.message);return}
  const row={title:caseForm.title,process_number:number,client_id:caseForm.client_id||null,next_review:caseForm.next_review||null,
   tribunal:caseForm.tribunal||null,subject:caseForm.subject||null,lawyer:caseForm.lawyer||null,notes:caseForm.notes||null};
  if(editCaseId)row.status=caseForm.status||'ativo';
  const saved=await act(async()=>{const r=editCaseId?await db.from('office_cases').update({...row,updated_at:new Date().toISOString()}).eq('id',editCaseId):
   await db.from('office_cases').insert({...row,owner_id:session.user.id});if(r.error)throw r.error;},editCaseId?'Processo atualizado.':'Processo jurídico registrado.');
  if(saved){setCaseForm(emptyCase());setEditCaseId(null)}
 }
 async function createDeadline(e){e.preventDefault();
  try{validateOfficeDay(deadlineForm.due_on)}catch(e){setNotice(e.message);return}
  const row={title:deadlineForm.title,due_on:deadlineForm.due_on,kind:deadlineForm.kind,priority:deadlineForm.priority,
   case_id:deadlineForm.case_id||null,client_id:deadlineForm.client_id||null,verified:!!deadlineForm.verified,
   source:deadlineForm.source||null,source_url:deadlineForm.source_url||null,responsible:deadlineForm.responsible||null,notes:deadlineForm.notes||null};
  const saved=await act(async()=>{const r=editDeadlineId?await db.from('office_deadlines').update({...row,updated_at:new Date().toISOString()}).eq('id',editDeadlineId):
   await db.from('office_deadlines').insert({...row,owner_id:session.user.id});if(r.error)throw r.error;},editDeadlineId?'Prazo atualizado; confira a origem judicial.':'Prazo/tarefa cadastrado. A data deve ser conferida no documento de origem.');
  if(saved){setDeadlineForm(emptyDeadline());setEditDeadlineId(null)}
 }
 function startEditClient(x){setClient({...emptyClient(),...x,next_return:x.next_return||''});setEditClientId(x.id);setShowForm(true);}
 async function linkCaseClient(row,clientId,clientName){
  if(busy)return;setBusy(true);setNotice('');
  try{
   let id=String(clientId||'').trim();const clean=String(clientName||'').trim();
   if(!id&&clean.length>=2){
    const prior=clients.find(x=>x.name.toLocaleLowerCase('pt-BR')===clean.toLocaleLowerCase('pt-BR'));
    if(prior)id=prior.id;
    else{const created=await db.from('office_clients').insert({owner_id:session.user.id,name:clean,notes:'Cadastro vinculado manualmente ao processo '+(row.process_number||row.title)+'; conferir identificação e documentos.'}).select('id').single();if(created.error||!created.data?.id)throw Error(created.error?.message||'O cliente não pôde ser registrado.');id=created.data.id}
   }
   if(!id)throw Error('Selecione um cliente ou informe um nome confirmado pelo operador.');
   const attached=await db.from('office_cases').update({client_id:id,updated_at:new Date().toISOString()}).eq('id',row.id).select('id').maybeSingle();
   if(attached.error||!attached.data?.id)throw Error(attached.error?.message||'Vínculo ao processo não foi confirmado.');
   setNotice('Cliente vinculado ao processo. O nome foi informado/confirmado pelo operador, não presumido do DJEN.');await load();
  }catch(e){setNotice('Vínculo não realizado: '+e.message)}finally{setBusy(false)}
 }
 function startEditCase(x){setCaseForm({...emptyCase(),...x,client_id:x.client_id||'',next_review:x.next_review||'',process_number:x.process_number||''});setEditCaseId(x.id);setShowForm(true);}
 function startEditDeadline(x){setDeadlineForm({...emptyDeadline(),...x,case_id:x.case_id||'',client_id:x.client_id||'',source:x.source||'',source_url:x.source_url||''});setEditDeadlineId(x.id);setShowForm(true);}
 async function markDeadline(row){await act(async()=>{
  const r=await db.from('office_deadlines').update({status:'concluido',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id);
  if(r.error)throw r.error;
 },'Item concluído por operador.')}
 async function courtSearch(row,fonte,period={}){
  if(!row.process_number)return setNotice('Informe um número CNJ para consultar o tribunal.');
  setConsulting(row.id+fonte);setCheckResult(null);setNotice('');
  try{
   const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)throw Error('Sessão expirada');
   const r=await fetch('/api/processos/consulta?'+new URLSearchParams({numero:row.process_number,fonte,...(period?.inicio?{inicio:period.inicio}:{}),...(period?.fim?{fim:period.fim}:{})}),{headers:{Authorization:'Bearer '+s.access_token}});
   const p=await r.json();if(!p.ok)throw Error(p.error||'Fonte indisponível');
   setCheckResult({...p,number:row.process_number});setNotice((p.fromCache?'Cache oficial anterior consultado. ':'')+(p.notice||'Consulta concluída.'));
  }catch(e){setNotice('Consulta não confirmada: '+e.message)}finally{setConsulting('')}
 }
 async function saveEditedDocument(){if(!docResult?.id)return;setBusy(true);const r=await db.from('office_documents').update({body:docResult.body,status:'revisao',updated_at:new Date().toISOString()}).eq('id',docResult.id);setBusy(false);setNotice(r.error?'Minuta não salva: '+r.error.message:'Minuta atualizada e encaminhada para revisão.');if(!r.error)await load();}
 const download=(body,filename)=>{
  const blob=new Blob([body],{type:'text/plain;charset=utf-8'});const u=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=u;a.download=filename.replace(/[^a-z0-9._-]/gi,'_');a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)
 };
 async function generateDocument(e){
  e.preventDefault();const caseRecord=selectedCase?cases.find(x=>x.id===selectedCase):null;
   if(selectedCase&&!caseRecord){setNotice('Processo informado não consta da carteira atual.');return}
  setBusy(true);setNotice('');
  try{
   const client=caseRecord?clients.find(x=>x.id===caseRecord.client_id):null;
   let evidence=[];
   if(caseRecord?.process_number){
    const r=await db.from('crm_judicial_snapshots').select('source,checked_at,payload').eq('process_number',caseRecord.process_number).order('checked_at',{ascending:false}).limit(8);
    if(r.error)throw Error('Não foi possível conferir as fontes oficiais: '+r.error.message);
    evidence=(r.data||[]).map(x=>({source:x.source,checked_at:x.checked_at,summary:safeText(x.payload?.items?.[0]?.title||x.payload?.items?.[0]?.description,200)}));
   }
   let draft=caseRecord?makePetitionSkeleton({kind:docKind,caseRecord,client,instructions:docInstructions,evidence}):makeStandalonePetition({kind:docKind,instructions:docInstructions}),modelUsed='estrutura-verificavel',avisoAi='';
   if(useAi){
    if(!caseRecord)avisoAi='A IA externa exige processo cadastrado. Minuta avulsa estruturada sem envio externo.';
    else{
     try{
      const {data:{session:s}}=await db.auth.getSession();
      if(!s?.access_token)throw Error('Sessão expirada');
      const r=await fetch('/api/office/ai',{method:'POST',headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
       body:JSON.stringify({caseId:caseRecord.id,kind:docKind,instructions:docInstructions,externalAiConsent:true})});
      const output=await r.json();if(!output.ok)throw Error(output.error||'IA indisponível');
      draft={...draft,body:output.content};modelUsed=output.model;
     }catch(err){avisoAi='IA externa não utilizada: '+String(err?.message||'falha').slice(0,180)+' · A minuta estruturada local foi preservada.';}
    }
   }
   const rec={owner_id:session.user.id,case_id:caseRecord?.id||null,client_id:caseRecord?.client_id||null,title:draft.title,kind:docKind,body:draft.body,
    evidence:draft.evidence,status:'rascunho',external_ai_consent:useAi,model_used:modelUsed};
   const result=await db.from('office_documents').insert(rec).select('id').single();
   if(result.error)throw result.error;
   setDocResult({...draft,id:result.data.id,modelUsed});setNotice('Minuta estruturada salva. '+(avisoAi?avisoAi+' ':'')+'Revisão do advogado é obrigatória antes de qualquer uso.');await load();
  }catch(e){setNotice('Minuta não concluída: '+e.message)}
  finally{setBusy(false)}
 }
 const threads=useMemo(()=>Array.from(new Map([...messages].sort((a,b)=>String(b.received_at).localeCompare(String(a.received_at))).map(m=>[m.phone,m])).values()),[messages]);
 const currentThread=messages.filter(m=>m.phone===selectedPhone).sort((a,b)=>String(a.received_at).localeCompare(String(b.received_at)));
 const lastInbound=[...currentThread].reverse().find(x=>x.direction==='inbound');
 useEffect(()=>{if(area!=='whatsapp')return;let active=true;
  db.auth.getSession().then(async({data})=>{
   if(!data?.session?.access_token)return;
   const r=await fetch('/api/office/whatsapp/status',{headers:{Authorization:'Bearer '+data.session.access_token}});
   const p=await r.json();if(active)setWhatsappStatus(p)
  }).catch(()=>{if(active)setWhatsappStatus({configured:false})});
  return()=>{active=false};
 },[area,db]);
 async function sendWhatsApp(e){e.preventDefault();if(!selectedPhone||!reply.trim())return;
  setBusy(true);setNotice('');
  try{
   const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)throw Error('Sessão expirada');
   const r=await fetch('/api/office/whatsapp/send',{method:'POST',headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify({phone:selectedPhone,text:reply.trim(),approved:true})});
   const p=await r.json();if(!p.ok)throw Error(p.error||'Provedor recusou');
   setReply('');setNotice(p.warning||'WhatsApp confirmou o envio.');await load();
  }catch(e){setNotice('Mensagem não enviada: '+e.message)}finally{setBusy(false)}
 }
 async function runMini(){
  setBusy(true);setNotice('');
  const result=officeMiniReview({clients,cases,deadlines,leads,messages});setMiniResult(result);
  const {error}=await db.from('office_agent_runs').insert({owner_id:session.user.id,agent:'mini',task:'Revisar fila do escritório',result,mode:'manual',status:'review',sources:[{type:'crm',date:result.asOf}],external_actions:0});
  setBusy(false);
  setNotice(error?'Triagem exibida, mas o log não foi salvo: '+error.message:'Mini Agent executou triagem somente leitura e registrou seu relatório.');
 }
 return <main className={'inf-studio '+(area==='dashboard'?'pr-dashboard-route':'')}>
  <header className="inf-heading"><div><small>BLACKHOLE · INTELIGÊNCIA JURÍDICA</small><h1>{titleMap[area]||'Painel jurídico'}</h1>
   <p>{area==='dashboard'?'Controle da carteira, prazos, audiências, atendimento e agentes sem dados inventados.': 'Área jurídica integrada aos dados privados do escritório e às fontes verificadas.'}</p></div>
   <div className="inf-actions"><button type="button" className="inf-btn" onClick={load} disabled={loading||busy}><RefreshCw size={15}/> Atualizar</button>
    {['clients','cases','deadlines','audiencias'].includes(area)&&<button type="button" className="inf-btn primary" onClick={()=>setShowForm(x=>!x)}><Plus size={15}/> Novo {area==='clients'?'cliente':area==='cases'?'processo':'item'}</button>}</div>
  </header>
  {notice&&<div className={'inf-note '+(/não |falha|recusou|erro|expirad|indisponível|bloqueou/i.test(notice)?'error':'')} role="status">{notice}</div>}
  {loading&&<div className="inf-note">Carregando registros autorizados...</div>}
  {area==='dashboard'&&<PrestigeDashboard clients={clients} cases={cases} deadlines={deadlines} mini={mini} session={session} onRefresh={load}/>}
  {area==='clients'&&<><div className="inf-grid"><Stat label="Total na carteira jurídica" value={clients.length} href="/clientes"/><Stat label="Ativos" value={clients.filter(x=>x.status==='ativo').length} href="/clientes"/><Stat label="Com processo" value={new Set(cases.filter(x=>x.client_id).map(x=>x.client_id)).size} href="/processos"/><Stat label="Retornos cadastrados" value={clients.filter(x=>x.next_return).length} href="/prazos"/></div>
   {showForm&&<section className="inf-panel"><h2>{editClientId?'Editar cliente jurídico':'Cadastrar cliente jurídico'}</h2><form className="office-form-col" onSubmit={createClient}>
    <div className="inf-fields"><label>Nome completo<input required minLength={2} value={client.name} onChange={e=>setClient({...client,name:e.target.value})}/></label>
     <label>Telefone<input value={client.phone} onChange={e=>setClient({...client,phone:e.target.value})}/></label>
     <label>E-mail<input type="email" value={client.email} onChange={e=>setClient({...client,email:e.target.value})}/></label>
     <label>Documento (opcional)<input value={client.document} onChange={e=>setClient({...client,document:e.target.value})}/></label>
     <label>Responsável<input value={client.responsible||''} onChange={e=>setClient({...client,responsible:e.target.value})}/></label>
     {editClientId&&<label>Situação<select value={client.status||'ativo'} onChange={e=>setClient({...client,status:e.target.value})}><option value="ativo">Ativo</option><option value="arquivado">Arquivado</option></select></label>}
     <label>Próximo retorno (data informada)<input type="date" value={client.next_return} onChange={e=>setClient({...client,next_return:e.target.value})}/></label>
     <label style={{gridColumn:'1/-1'}}>Observações<textarea value={client.notes} onChange={e=>setClient({...client,notes:e.target.value})}/></label>
    </div><div className="inf-row-end"><button type="submit" className="inf-btn primary" disabled={busy}>{editClientId?"Salvar alterações":"Salvar cliente"}</button></div>
    </form></section>}
   <PrestigeClients clients={clients} cases={cases} query={query} setQuery={setQuery} edit={startEditClient}/>
</>}
  {area==='cases'&&<><div className="inf-grid"><Stat label="Processos da carteira" value={cases.length} href="/processos"/><Stat label="Ativos" value={cases.filter(x=>x.status==='ativo').length} href="/processos"/><Stat label="Com número CNJ" value={cases.filter(x=>x.process_number).length} href="/processos"/><Stat label="Com revisão agendada" value={cases.filter(x=>x.next_review).length} href="/prazos"/></div>
   {showForm&&<section className="inf-panel"><h2>{editCaseId?'Editar processo':'Cadastrar processo'}</h2><form onSubmit={createCase} className="office-form-col"><div className="inf-fields">
      <label>Assunto / identificação<input required minLength={3} value={caseForm.title} onChange={e=>setCaseForm({...caseForm,title:e.target.value})}/></label>
      <label>Número CNJ (se houver)<input value={caseForm.process_number} onChange={e=>setCaseForm({...caseForm,process_number:e.target.value})} placeholder="0000000-00.0000.0.00.0000"/></label>
      <label>Cliente<select value={caseForm.client_id} onChange={e=>setCaseForm({...caseForm,client_id:e.target.value})}><option value="">Não vinculado</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label>Tribunal<input value={caseForm.tribunal} onChange={e=>setCaseForm({...caseForm,tribunal:e.target.value})}/></label>
      <label>Área / matéria<input value={caseForm.subject} onChange={e=>setCaseForm({...caseForm,subject:e.target.value})}/></label>
      <label>Advogado responsável<input value={caseForm.lawyer||''} onChange={e=>setCaseForm({...caseForm,lawyer:e.target.value})}/></label>
      {editCaseId&&<label>Situação<select value={caseForm.status||'ativo'} onChange={e=>setCaseForm({...caseForm,status:e.target.value})}>{['ativo','suspenso','encerrado'].map(k=><option key={k}>{k}</option>)}</select></label>}
      <label>Próxima revisão<input type="date" value={caseForm.next_review} onChange={e=>setCaseForm({...caseForm,next_review:e.target.value})}/></label>
      <label style={{gridColumn:'1/-1'}}>Notas<textarea value={caseForm.notes} onChange={e=>setCaseForm({...caseForm,notes:e.target.value})}/></label>
    </div><div className="inf-row-end"><button disabled={busy} className="inf-btn primary">Salvar processo</button></div></form></section>}
   <PrestigeCases cases={cases} clients={clients} query={query} setQuery={setQuery} edit={startEditCase} court={courtSearch} consulting={consulting} linkClient={linkCaseClient}/>
    {checkResult&&<div className="inf-note"><strong>{checkResult.number} · {checkResult.source||'Fonte oficial'}</strong>
     {checkResult.partial&&<p style={{fontWeight:750,color:'#9a3412'}}>Consulta parcial: outra fonte foi usada. Não confirma publicação no DJEN.</p>}
     {checkResult.sourceStatus&&<p>Fontes: DJEN {checkResult.sourceStatus.djen} · DataJud {checkResult.sourceStatus.datajud}</p>}
     <p>{checkResult.notice}</p><small>Consulta: {display(checkResult.checkedAt)}{checkResult.fromCache?' · reutilizada do cache':''}</small>
     <div className="office-records">{(checkResult.items||[]).slice(0,300).map((i,n)=><div key={n} className="office-record">{safeText(i.title||i.description||i.texto||JSON.stringify(i),500)}</div>)}</div></div>}
</>}
  {['deadlines','audiencias'].includes(area)&&<>{area==='audiencias'&&<BlackholeOfficialHearings db={db}/>}<div className="inf-grid"><Stat label="Pendentes" value={mini.counts.deadlines} href="/prazos"/><Stat label="Vencidos" value={mini.counts.overdue} href="/prazos?status=vencidos"/><Stat label="Hoje" value={mini.counts.today} href="/prazos?status=hoje"/><Stat label="Próximos 7 dias" value={mini.counts.week} href="/prazos"/></div>
   {showForm&&<section className="inf-panel"><h2>{editDeadlineId?'Editar prazo ou audiência':'Novo prazo, audiência ou retorno'}</h2><form onSubmit={createDeadline}><div className="inf-fields">
     <label>Descrição<input required minLength={3} value={deadlineForm.title} onChange={e=>setDeadlineForm({...deadlineForm,title:e.target.value})}/></label>
     <label>Data<input required type="date" value={deadlineForm.due_on} onChange={e=>setDeadlineForm({...deadlineForm,due_on:e.target.value})}/></label>
     <label>Tipo<select value={deadlineForm.kind} onChange={e=>setDeadlineForm({...deadlineForm,kind:e.target.value})}>{['prazo','audiencia','retorno','tarefa'].map(k=><option key={k} value={k}>{k}</option>)}</select></label>
     <label>Processo<select value={deadlineForm.case_id} onChange={e=>setDeadlineForm({...deadlineForm,case_id:e.target.value})}><option value="">Não vinculado</option>{cases.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
     <label>Cliente<select value={deadlineForm.client_id} onChange={e=>setDeadlineForm({...deadlineForm,client_id:e.target.value})}><option value="">Não vinculado</option>{clients.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
     <label>Prioridade<select value={deadlineForm.priority} onChange={e=>setDeadlineForm({...deadlineForm,priority:e.target.value})}>{['normal','alta','urgente'].map(k=><option key={k}>{k}</option>)}</select></label>
     <label>Fonte (ex.: intimação no PJe)<input value={deadlineForm.source} onChange={e=>setDeadlineForm({...deadlineForm,source:e.target.value})}/></label>
     <label>URL da evidência<input type="url" value={deadlineForm.source_url} onChange={e=>setDeadlineForm({...deadlineForm,source_url:e.target.value})}/></label>
     <label>Responsável<input value={deadlineForm.responsible} onChange={e=>setDeadlineForm({...deadlineForm,responsible:e.target.value})}/></label>
     <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={deadlineForm.verified} onChange={e=>setDeadlineForm({...deadlineForm,verified:e.target.checked})} style={{width:'auto'}}/> Data conferida no documento oficial</label>
     <label style={{gridColumn:'1/-1'}}>Notas<textarea value={deadlineForm.notes} onChange={e=>setDeadlineForm({...deadlineForm,notes:e.target.value})}/></label>
    </div><div className="inf-row-end"><button disabled={busy} className="inf-btn primary">Salvar item</button></div></form></section>}
   <section className="inf-panel"><h2>{area==='audiencias'?'Agenda de audiências':'Fila de prazos e atividades'}</h2><Source>Datas extraídas ou digitadas exigem conferência de intimação, início de contagem, feriados e suspensão de expediente. Esta tela não calcula prazo processual automaticamente.</Source>
    <div className="inf-toolbar"><div className="inf-tabs">{['abertos','vencidos','hoje','semana','todos'].map(k=><button key={k} aria-pressed={deadlineFilter===k} onClick={()=>setDeadlineFilter(k)}>{k}</button>)}</div><input className="inf-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar prazo ou processo"/></div>
    <div className="office-records">{deadlines.filter(x=>area!=='audiencias'||(x.kind==='audiencia'&&x.due_on>=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})&&x.status==='aberto')).filter(x=>deadlineFilter==='todos'||(deadlineFilter==='abertos'?x.status==='aberto':deadlineState(x)===deadlineFilter)).filter(x=>match([x.title,x.responsible,getCaseTitle(x.case_id)])).slice(0,300).map(x=><article key={x.id} className="office-record">
      <div className="office-toolbar"><strong>{x.title}</strong><span className={'office-badge office-status-'+deadlineState(x)}>{deadlineState(x)}</span></div>
      <p>{dateLabel(x.due_on)} · {x.kind} · {x.priority} · {x.responsible||'Sem responsável'}</p>
      <small>{getCaseTitle(x.case_id)} · Fonte: {x.source||'não informada'} · {x.verified?'Conferida':'Sem confirmação documental'}</small>
      <div className="office-action-row">{x.source_url&&<a className="inf-btn" href={x.source_url} target="_blank" rel="noreferrer">Fonte <ExternalLink size={12}/></a>}
       {x.status==='aberto'&&<><button className="inf-btn" onClick={()=>startEditDeadline(x)}>Editar</button>
       <button className="inf-btn" disabled={busy} onClick={()=>markDeadline(x)}><CheckCircle2 size={14}/> Concluir</button></>}</div>
    </article>)}{!deadlines.length&&<div className="office-list-empty">Nenhum prazo cadastrado.</div>}</div>
   </section></>}
  {area==='documents'&&<><div className="office-panel-grid"><section className="inf-panel"><h2>Gerar peça ou petição</h2>
   <form className="office-form-col" onSubmit={generateDocument}>
    <label>Processo (opcional)<select value={selectedCase} onChange={e=>setSelectedCase(e.target.value)}><option value="">Peça avulsa — sem processo cadastrado</option>{cases.map(c=><option key={c.id} value={c.id}>{c.process_number||'Sem CNJ'} · {c.title}</option>)}</select></label>
    <label>Tipo de peça<select value={docKind} onChange={e=>setDocKind(e.target.value)}>{OFFICE_DOC_TYPES.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
    <label>Fatos e instruções do advogado<textarea value={docInstructions} onChange={e=>setDocInstructions(e.target.value)} maxLength={1500} placeholder="Informe fatos que constam dos autos, objetivo, fase e pontos a conferir."/></label>
    <label className="office-hint" style={{display:'flex',alignItems:'center',gap:7}}><input style={{width:'auto'}} type="checkbox" checked={useAi} onChange={e=>setUseAi(e.target.checked)}/> Autorizar envio do contexto processual ao modelo externo configurado para gerar minuta com IA</label>
    <button className="inf-btn primary" disabled={busy}><FileText size={14}/> {busy?'Preparando...':'Gerar e salvar minuta'}</button>
    <Source>Sem API de IA configurada, o sistema gera estrutura editável com lacunas explícitas. Nenhuma fundamentação ou documento inexistente será inventado. Não há peticionamento automático.</Source>
   </form></section>
   <section className="inf-panel"><h2>Minuta gerada</h2>{docResult?<><div className="inf-toolbar office-document-controls"><span className="inf-badge">Rascunho · revisão obrigatória</span><button type="button" className="inf-btn" onClick={saveEditedDocument} disabled={busy}>Salvar revisão</button><button type="button" className="inf-btn" onClick={()=>download(docResult.body,'minuta-'+docResult.id+'.txt')}><Download size={14}/> Exportar TXT</button>
      <button type="button" className="inf-btn" onClick={()=>setShowPreview(x=>!x)}>{showPreview?'Ocultar folha A4':'Visualizar folha A4'}</button>
      <button type="button" className="inf-btn primary" onClick={()=>{setShowPreview(true);window.setTimeout(()=>window.print(),0)}}>Imprimir / Salvar PDF</button></div>
    <textarea className="office-document" aria-label="Texto da minuta" value={docResult.body} onChange={e=>setDocResult({...docResult,body:e.target.value})}/>
    {showPreview&&<div className="office-document-preview" role="document" aria-label="Prévia A4 da petição">{docResult.body}</div>}
    <Source>Edite o texto e clique em Salvar revisão. Advogado responsável deve conferir antes de aprovar ou protocolar.</Source></>:<div className="office-list-empty">Selecione um processo e gere uma minuta para revisão.</div>}</section></div>
   <section className="inf-panel"><h2>Peças registradas</h2><div className="office-records">{documents.map(x=><article className="office-record" key={x.id}><strong>{x.title}</strong><p>{x.kind} · {x.status} · {dateLabel(x.created_at)}</p><div className="office-action-row">
     <button className="inf-btn" onClick={()=>setDocResult({id:x.id,body:x.body,title:x.title})}>Abrir minuta</button>
     <button className="inf-btn" onClick={()=>download(x.body,'peca-'+x.id+'.txt')}><Download size={13}/> Exportar</button></div></article>)}
    {!documents.length&&<div className="office-list-empty">Nenhuma peça cadastrada.</div>}</div></section>
  </>}
  {area==='whatsapp'&&<><div className="w1-whatsapp-head"><div><small>CENTRAL DE ATENDIMENTO</small><h2>WhatsApp no CRM</h2><p>Selecione uma conversa, consulte o histórico e responda aqui pela API oficial quando ela estiver configurada.</p></div><button type="button" className="inf-btn" onClick={()=>setShowManualWeb(x=>!x)}>{showManualWeb?'Ocultar acesso manual':'Usar WhatsApp Web manual'}</button></div>{showManualWeb&&<section className="inf-panel" aria-label="WhatsApp Web gratuito">
    <h2>WhatsApp Web · atendimento sem API oficial</h2>
    <p>Abra uma conversa com seu aparelho já vinculado. Você confirma o destinatário e clica em Enviar no próprio WhatsApp; abrir a conversa não registra nem confirma atendimento.</p>
    <form className="office-form-col" onSubmit={e=>{e.preventDefault();try{
      const url=blackholeWhatsAppWebUrl(webPhone,webText);
      const opened=window.open(url,'_blank','noopener,noreferrer');
      setNotice(opened?'WhatsApp Web aberto. Confira o número e confirme o envio no WhatsApp. Nenhuma mensagem foi registrada automaticamente.':'O navegador pode ter bloqueado a nova aba; permita pop-ups para abrir o WhatsApp Web.');
    }catch(err){setNotice(err.message)}}}>
     <div className="inf-fields">
      <label>Escolher cliente cadastrado<select value="" onChange={e=>{const x=clients.find(c=>c.id===e.target.value);if(x?.phone)setWebPhone(x.phone)}}>
       <option value="">Selecionar da carteira (opcional)</option>{clients.filter(c=>c.phone).map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></label>
      <label>DDD + telefone<input type="tel" required value={webPhone} placeholder="(11) 99999-1234" onChange={e=>setWebPhone(e.target.value)}/></label>
      <label style={{gridColumn:'1/-1'}}>Mensagem (opcional)<textarea rows={3} maxLength={3000} value={webText} onChange={e=>setWebText(e.target.value)} placeholder="Digite a mensagem para revisão no WhatsApp Web..."/></label>
     </div>
     <div className="inf-row-end"><button className="inf-btn primary" type="submit">Abrir conversa no WhatsApp Web</button></div>
    </form>
   </section>}<div className="inf-grid"><Stat label="Mensagens registradas" value={messages.length} href="/whatsapp"/><Stat label="Recebidas" value={messages.filter(m=>m.direction==='inbound').length} href="/whatsapp"/><Stat label="Conversas" value={threads.length} href="/whatsapp"/><Stat label="Clientes cadastrados" value={clients.length} href="/clientes"/></div>
   <Source>{whatsappStatus?.configured?'A API do WhatsApp Business está configurada. Respostas só serão enviadas mediante confirmação manual e janela válida.':'O envio e recebimento automáticos por QR dependem de um serviço persistente Baileys/WA.Auto vinculado. Enquanto isso, o WhatsApp Web manual acima funciona sem API.'} O agente apenas prepara rascunhos.</Source>
   <div className="office-panel-grid"><section className="inf-panel"><h2>Conversas recebidas</h2><div className="office-records">{threads.map(m=><button key={m.phone} type="button" className="office-record" style={{textAlign:'left',cursor:'pointer'}} onClick={()=>{setSelectedPhone(m.phone);setReply('')}}><strong>{m.display_name||m.phone}</strong><p>{m.phone} · {dateLabel(m.received_at)}</p><small>{safeText(m.body,130)}</small></button>)}
    {!threads.length&&<div className="office-list-empty">Nenhuma mensagem recebida pelo webhook oficial.</div>}</div></section>
    <section className="inf-panel"><h2>Atendimento {selectedPhone||''}</h2>{selectedPhone?<><div className="office-whatsapp-messages">{currentThread.map(m=><div key={m.id} className={'office-bubble '+m.direction}><small className="office-hint">{m.direction==='inbound'?'Cliente':'Escritório'} · {dateLabel(m.received_at)}</small><div>{m.body}</div></div>)}</div>
      <form onSubmit={sendWhatsApp} className="office-form-col" style={{marginTop:15}}><label>Resposta revisada pelo operador<textarea value={reply} maxLength={1000} onChange={e=>setReply(e.target.value)}/></label>
       <div className="office-action-row"><button type="button" className="inf-btn" onClick={()=>setReply(buildWhatsAppSuggestion(lastInbound||{}))}>Mini Agent: sugerir resposta</button>
       <button type="submit" disabled={!reply.trim()||busy||!whatsappStatus?.configured||!lastInbound||!canReplyWhatsApp(lastInbound.received_at)} className="inf-btn primary">Confirmar e enviar pela API oficial</button></div></form>
      <Source>Envio exige conexão oficial, mensagem recebida nas últimas 24 horas e clique humano. Fora da janela, somente templates aprovados — não implementados aqui.</Source>
     </>:<div className="office-list-empty">Selecione uma conversa para responder.</div>}</section></div>
  </>}
  {area==='agents'&&<>
   <div className="blackhole-agents-header">
    <div><small>BLACKHOLE / ESTÚDIO DE AGENTES</small><h2>Agentes de IA e automação</h2>
     <p>Especialistas para receber demandas, organizar processos, revisar evidências e preparar atendimentos. Cada card indica sua capacidade real.</p></div>
    <div className="inf-actions"><Link className="inf-btn" href="/superagente">Abrir Superagente</Link>
      <Link className="inf-btn primary" href="/scanner">Executar scanner Hermes</Link></div>
   </div>
   <div className="blackhole-agent-section-title"><strong>Comece rápido</strong><small>Áreas do escritório · ações disponíveis agora</small></div>
   <div className="blackhole-agent-templates">
    <Link className="blackhole-agent-template" href="/leads"><span className="blackhole-template-icon"><BriefcaseBusiness size={18}/></span>
      <strong>Comercial</strong><p>Qualifique contatos da carteira, revise a origem e acompanhe o funil de leads.</p><small>Abrir leads →</small></Link>
    <Link className="blackhole-agent-template" href="/whatsapp"><span className="blackhole-template-icon"><Headset size={18}/></span>
      <strong>Suporte</strong><p>Prepare respostas e acompanhe atendimentos com verificação antes de enviar.</p><small>Abrir WhatsApp →</small></Link>
    <a className="blackhole-agent-template" href="#mini-triagem"><span className="blackhole-template-icon"><Bot size={18}/></span>
      <strong>Triagem</strong><p>Priorize pendências, retornos e demandas sem inventar movimentações.</p><small>Executar mini agente →</small></a>
    <Link className="blackhole-agent-template" href="/pecas"><span className="blackhole-template-icon"><Scale size={18}/></span>
      <strong>Causas</strong><p>Organize o caso e produza uma minuta jurídica para revisão profissional.</p><small>Abrir peças →</small></Link>
   </div>
   <div className="blackhole-agent-section-title"><strong>Agentes do escritório</strong><small>{OFFICE_AGENTS.length} especialidades · execução sob controle do operador</small></div>
   <div className="blackhole-agent-search"><input className="inf-search" type="search" value={agentSearch} onChange={e=>setAgentSearch(e.target.value)}
    placeholder="Pesquisar agentes por nome, tarefa ou especialidade..." aria-label="Pesquisar agentes"/>
    <label><Filter size={13}/> Mostrar <select aria-label="Filtrar agentes" value={agentFilter} onChange={e=>setAgentFilter(e.target.value)}>
     <option value="todos">Todos</option><option value="oficial">Consulta oficial</option><option value="deterministico">Motor local</option><option value="modelo-opcional">IA opcional</option>
    </select></label>
   </div>
   <div className="office-agent-grid">{OFFICE_AGENTS.filter(x=>
    (agentFilter==='todos'||x.mode===agentFilter)&&
    [x.name,x.role,x.mode].some(v=>String(v||'').toLowerCase().includes(agentSearch.toLowerCase()))
   ).map(x=><article className="office-agent-card" key={x.id}>
    <span className="inf-badge">{x.mode==='oficial'?'Fonte pública':x.mode==='deterministico'?'Motor local':'Modelo opcional'}</span>
    <strong style={{marginTop:9}}>{x.name}</strong><p>{x.role}</p>
    <Link className="inf-btn" href={x.id==='mini'?'/agentes#mini-triagem':x.id==='hermes'?'/scanner':x.id==='pecas'||x.id==='pesquisa'?'/pecas':x.id==='tribunais'?'/processos':x.id==='prazos'||x.id==='audiencias'?'/prazos':x.id==='whatsapp'||x.id==='posvenda'?'/whatsapp':x.id==='leads'?'/leads':'/relatorios'}>Abrir área</Link>
   </article>)}</div>
   <BlackholeHermesAgent db={db} session={session}/>
   <div className="inf-panel" id="mini-triagem"><h2>Mini Agent · análise operacional</h2><p>Uma execução por clique, com trilha auditável. Concentra o que vence hoje, atrasos e o que necessita conferir.</p>
    <div className="office-action-row"><button className="inf-btn primary" onClick={runMini} disabled={busy}><Bot size={14}/> Executar triagem</button></div>
    {miniResult&&<div className="inf-note"><strong>{miniResult.asOf} · {miniResult.actions.length} ações sugeridas</strong><div className="office-records">{miniResult.actions.map((x,i)=><article key={x.kind+x.id+i} className="office-record">{x.kind} · {x.title} · {dateLabel(x.date)}</article>)}</div>
     <small>{miniResult.notes.join(' ')}</small></div>}
   </div>
   <section className="inf-panel" style={{marginTop:15}}><h2>Execuções registradas</h2>{runs.slice(0,15).map(r=><article className="office-record" key={r.id}><strong>{r.agent} · {r.task}</strong><small>{dateLabel(r.created_at)} · {r.status} · {r.external_actions} ações externas</small></article>)}
    {!runs.length&&<div className="office-list-empty">Ainda não há execuções registradas.</div>}</section>
  </>}
  {area==='reports'&&<><div className="inf-grid"><Stat label="Clientes do escritório" value={clients.length} href="/clientes"/><Stat label="Casos cadastrados" value={cases.length} href="/processos"/><Stat label="Prazos vencidos" value={mini.counts.overdue} href="/prazos"/><Stat label="Leads na carteira" value={leads.length} href="/leads"/></div>
    <section className="inf-panel"><h2>Relatório operacional verificável</h2><Source>Contagens da carteira jurídica autorizada, limitada ao conjunto carregado. Não representam decisões judiciais nem desempenho financeiro ou comercial presumido.</Source>
     <div className="office-records"><article className="office-record">Prazos do dia: {mini.counts.today}</article><article className="office-record">Prazos da semana: {mini.counts.week}</article>
     <article className="office-record">Itens não verificados: {mini.counts.unverified}</article><article className="office-record">Mensagens registradas: {messages.length}</article>
     <article className="office-record">Relatórios de agentes registrados: {runs.length}</article></div></section></>}
 </main>;
}
export default function OfficeConsole({area='dashboard'}){return <SecuredWorkspace active={titleMap[area]||'Painel jurídico'}>{({db,session})=><OfficeUI area={area} db={db} session={session}/>}</SecuredWorkspace>}
