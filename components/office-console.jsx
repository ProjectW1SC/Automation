'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {RefreshCw,Plus,Search,FileText,CalendarDays,ShieldCheck,MessageSquare,Users,BriefcaseBusiness,Clock3,ExternalLink,Download,Bot,CheckCircle2,Scale,Headset,Filter} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import LexisSharedOffice from './lexis-shared-office';
import LexisDashboard from './lexis-dashboard';
import LexisOperations from './lexis-operations';
import OfficeDocumentWorkspace from './office-document-workspace';
import {downloadLegalDocx,printLegalPdf} from '../lib/legal-document-export.mjs';
import {runBlackholeQwen} from '../lib/blackhole-local-llm.mjs';
import PrestigeDashboard from './prestige-dashboard';
import {PrestigeClients,PrestigeCases} from './prestige-office-lists';
import BlackholeHermesAgent from './blackhole-hermes-agent';
import BlackholeOfficialHearings from './blackhole-official-hearings';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
import {loadOfficeCollections} from '../lib/office-paginated-data.mjs';
import {makeStandalonePetition} from '../lib/blackhole-petitions.mjs';
import {inspectJudicialDocument} from '../lib/legal-draft-engine.mjs';
import {blackholeWhatsAppWebUrl} from '../lib/blackhole-whatsapp-web.mjs';
import {browseOfficialDjenNumber} from '../lib/blackhole-public-djen-browser.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
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
 const [docKind,setDocKind]=useState('manifestacao'),[docInstructions,setDocInstructions]=useState(''),[docSourceDocument,setDocSourceDocument]=useState(''),[docAppealType,setDocAppealType]=useState(''),[docResult,setDocResult]=useState(null),[useAi,setUseAi]=useState(false),[showPreview,setShowPreview]=useState(true);
 const [qwenPetitionConsent,setQwenPetitionConsent]=useState(false),[qwenPetitionResult,setQwenPetitionResult]=useState(''),[qwenPetitionStatus,setQwenPetitionStatus]=useState('');
 const sourceInfo=useMemo(()=>docSourceDocument?inspectJudicialDocument(docSourceDocument):null,[docSourceDocument]);
 const [webGpuAvailable,setWebGpuAvailable]=useState(null);
 useEffect(()=>{setWebGpuAvailable(typeof navigator!=='undefined'&&Boolean(navigator.gpu))},[]);
 const [selectedPhone,setSelectedPhone]=useState(''),[reply,setReply]=useState(''),[whatsappStatus,setWhatsappStatus]=useState(null);
 const [webPhone,setWebPhone]=useState(''),[webText,setWebText]=useState('');
 const [showManualWeb,setShowManualWeb]=useState(false);
 const [miniResult,setMiniResult]=useState(null),[deadlineFilter,setDeadlineFilter]=useState('abertos');
 const [agentSearch,setAgentSearch]=useState(''),[agentFilter,setAgentFilter]=useState('todos');
 const need=LOADED[area]||LOADED.dashboard;
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const {datasets,errors}=await withAuthDeadline(loadOfficeCollections(db,need),30000);
   // Só fontes completas podem substituir o estado. Não transformar erro em zero.
   if(Object.keys(datasets).length)setData(old=>({...old,...datasets}));
   if(errors.length)setNotice('Carregamento incompleto: '+errors.join(' · ')+'. Os dados incompletos não foram exibidos como totais.');
  }catch(error){setNotice('Falha ao carregar a carteira: '+String(error?.message||'Erro de conexão')+'. Atualize para tentar novamente.')}
  finally{setLoading(false)}
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
   const {data:{session:s}}=await withAuthDeadline(db.auth.getSession());
   if(!s?.access_token)throw Error('Sessão expirada. Entre novamente no CRM.');
   const result=await consultHistoricalCase({
    independentSources:true,onResult:result=>setCheckResult({...result,number:row.process_number}),number:row.process_number,source:fonte,start:period?.inicio||undefined,end:period?.fim||undefined,page:period?.pagina||1,
    fetchServer:async({number,source,start,end,page,signal})=>{
     const args=new URLSearchParams({numero:number,fonte:source,...(start?{inicio:start}:{}),...(end?{fim:end}:{}),pagina:String(page)});
     const response=await fetch('/api/processos/consulta?'+args,{headers:{Authorization:'Bearer '+s.access_token},cache:'no-store',signal});
     try{return await response.json()}catch{throw Error('Consulta oficial retornou dados inválidos (HTTP '+response.status+').')}
    },
    // Somente API pública, sem CAPTCHA, token ou requisição automática em segundo plano.
    fetchBrowser:async({number,start,end,page,signal})=>browseOfficialDjenNumber({number,start,end,page,signal}),
    onProgress:({current,total,start,end})=>setNotice('Consultando fontes oficiais: '+current+'/'+total+' · DJEN '+(start&&end?start+' a '+end:'janela padrão dos últimos 30 dias'))
   });
   setCheckResult({...result,number:row.process_number});
   const coverage=result.windowsTotal>1?' · '+result.windowsChecked+'/'+result.windowsTotal+' meses consultados':'';
   const remaining=result.windowsPending?' · '+result.windowsPending+' meses pendentes devido à indisponibilidade das fontes':'';
   setNotice((result.ok?'Histórico judicial consultado. ':'Consulta não confirmada. ')+result.notice+
    (result.fromCache?' Registros anteriores preservados e identificados como cache.':'')+coverage+remaining+
    (result.sourceErrors?.djen?' · DJEN: '+result.sourceErrors.djen:'')+
    (result.sourceErrors?.datajud?' · DataJud: '+result.sourceErrors.datajud:''));
  }catch(e){setNotice('Consulta não confirmada: '+e.message)}
  finally{setConsulting('')}
 }
 async function askQwenPetition(){
  if(!docResult?.body)return;setQwenPetitionResult('');setQwenPetitionStatus('Preparando Qwen local...');
  try{const answer=await runBlackholeQwen('Revise APENAS a clareza e a redação deste trecho de petição. Não invente fatos, artigos ou jurisprudência. Produza até duas sugestões curtas. TRECHO: '+docResult.body.slice(0,950),[],progress=>setQwenPetitionStatus(progress.message||('Qwen: '+(progress.progress||0)+'%')),{consent:qwenPetitionConsent});
   setQwenPetitionResult(answer.reply);setQwenPetitionStatus('Sugestão local recebida. Use somente após revisão do advogado.');
  }catch(e){setQwenPetitionStatus('Qwen indisponível neste aparelho: '+e.message)}
 }
 async function saveEditedDocument(){if(!docResult?.id)return;setBusy(true);const r=await db.from('office_documents').update({body:docResult.body,status:'revisao',updated_at:new Date().toISOString()}).eq('id',docResult.id);setBusy(false);setNotice(r.error?'Minuta não salva: '+r.error.message:'Minuta atualizada e encaminhada para revisão.');if(!r.error)await load();}
 const exportWord=(body,id,title)=>{try{downloadLegalDocx(body,{id,title});setNotice('Documento Word (.docx) gerado com papel timbrado, margens A4 e assinatura para revisão.')}catch(e){setNotice('Não foi possível gerar Word: '+e.message)}};
 const exportPdf=body=>{try{printLegalPdf(body);setNotice('Página A4 aberta para imprimir ou salvar PDF. Confira o documento antes de protocolar.')}catch(e){setNotice('Não foi possível abrir impressão: '+e.message)}};
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
   const options={kind:docKind,instructions:docInstructions,sourceDocument:docSourceDocument,appealType:docAppealType};
   let draft=caseRecord?makePetitionSkeleton({...options,caseRecord,client,evidence}):makeStandalonePetition(options),
    modelUsed='estrutura-documental-local',avisoAi='',usedRemoteAi=false;
   if(useAi){
    try{
     const {data:{session:s}}=await withAuthDeadline(db.auth.getSession());
     if(!s?.access_token)throw Error('Sessão expirada');
     const response=await fetch('/api/office/ai',{method:'POST',
      headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({caseId:caseRecord?.id||null,...options,externalAiConsent:true})});
     const output=await response.json();
     if(!response.ok||!output.ok)throw Error(output.error||'Provedor de IA não respondeu.');
     draft={...draft,body:output.content};modelUsed=output.model;usedRemoteAi=true;
    }catch(error){avisoAi='IA externa não utilizada: '+String(error?.message||'falha').slice(0,180)+'. Minuta local preservada.'}
   }
   const rec={owner_id:session.user.id,case_id:caseRecord?.id||null,client_id:caseRecord?.client_id||null,title:draft.title,kind:docKind,body:draft.body,
    evidence:draft.evidence,status:'rascunho',external_ai_consent:usedRemoteAi,model_used:modelUsed};
   const result=await db.from('office_documents').insert(rec).select('id').single();
   if(result.error)throw result.error;
   setDocResult({...draft,id:result.data.id,modelUsed});setNotice('Minuta salva. '+(draft.evidence?.importedDocument?'Fonte judicial colada preservada como documento não verificado. ':'')+(avisoAi?avisoAi+' ':'')+'Confirme fatos, dispositivo, prazo e cabimento antes de utilizar.');await load();
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
   const {data:{session:s}}=await withAuthDeadline(db.auth.getSession());if(!s?.access_token)throw Error('Sessão expirada');
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
     {checkResult.partial&&<p style={{fontWeight:750,color:'#9a3412'}}>{checkResult.ok===false?'Nenhuma fonte respondeu nesta tentativa. Dados históricos anteriores podem continuar disponíveis.':'Consulta parcial. Consulte a origem e a data de cada movimentação.'}</p>}
     {checkResult.sourceStatus&&<p>Fontes: DJEN {checkResult.sourceStatus.djen} · DataJud {checkResult.sourceStatus.datajud}</p>}
     {checkResult.windowsTotal>1&&<p>Períodos mensais: {checkResult.windowsChecked}/{checkResult.windowsTotal} consultados{checkResult.windowsPending?' · restantes: '+checkResult.windowsPending:''}. Bloqueios não são tratados como ausência de movimentações.</p>}
     {checkResult.sourceErrors&&(checkResult.sourceErrors.djen||checkResult.sourceErrors.datajud)&&<p>Motivos: {checkResult.sourceErrors.djen?'DJEN: '+checkResult.sourceErrors.djen+'; ':''}{checkResult.sourceErrors.datajud?'DataJud: '+checkResult.sourceErrors.datajud:''}</p>}
     {checkResult.ok===false&&<p><a href="https://comunica.pje.jus.br/" rel="noreferrer" target="_blank">Conferir DJEN oficial</a> · <a href="https://datajud-wiki.cnj.jus.br/api-publica/" rel="noreferrer" target="_blank">Consultar documentação DataJud</a></p>}
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
  {area==='documents'&&<OfficeDocumentWorkspace {...{cases,selectedCase,setSelectedCase,docKind,setDocKind,docAppealType,setDocAppealType,docSourceDocument,setDocSourceDocument,sourceInfo,docInstructions,setDocInstructions,useAi,setUseAi,busy,generateDocument,docResult,setDocResult,saveEditedDocument,exportWord,showPreview,setShowPreview,exportPdf,qwenPetitionConsent,setQwenPetitionConsent,askQwenPetition,webGpuAvailable,qwenPetitionStatus,qwenPetitionResult,documents}}/>}
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
   <div className="inf-panel" id="mini-triagem"><h2>Mini Agent · análise operacional automática</h2><p>O Supabase executa uma triagem diária sem computador aberto, guardando pendências e retornos na trilha de auditoria. Use o botão para uma revisão adicional sob demanda.</p>
    <div className="office-action-row"><button className="inf-btn primary" onClick={runMini} disabled={busy}><Bot size={14}/> Executar triagem</button></div>
    {miniResult&&<div className="inf-note"><strong>{miniResult.asOf} · {miniResult.actions.length} ações sugeridas</strong><div className="office-records">{miniResult.actions.map((x,i)=><article key={x.kind+x.id+i} className="office-record">{x.kind} · {x.title} · {dateLabel(x.date)}</article>)}</div>
     <small>{miniResult.notes.join(' ')}</small></div>}
   </div>
   <section className="inf-panel" style={{marginTop:15}}><h2>Execuções registradas</h2>{runs.slice(0,15).map(r=><article className="office-record" key={r.id}><strong>{r.agent} · {r.task}</strong><small>{dateLabel(r.created_at)} · {r.mode==='scheduled'?'Agendado automaticamente':'Manual'} · {r.status} · {r.external_actions} ações externas</small></article>)}
    {!runs.length&&<div className="office-list-empty">Ainda não há execuções registradas.</div>}</section>
  </>}
  {area==='reports'&&<><div className="inf-grid"><Stat label="Clientes do escritório" value={clients.length} href="/clientes"/><Stat label="Casos cadastrados" value={cases.length} href="/processos"/><Stat label="Prazos vencidos" value={mini.counts.overdue} href="/prazos"/><Stat label="Leads na carteira" value={leads.length} href="/leads"/></div>
    <section className="inf-panel"><h2>Relatório operacional verificável</h2><Source>Contagens da carteira jurídica autorizada, limitada ao conjunto carregado. Não representam decisões judiciais nem desempenho financeiro ou comercial presumido.</Source>
     <div className="office-records"><article className="office-record">Prazos do dia: {mini.counts.today}</article><article className="office-record">Prazos da semana: {mini.counts.week}</article>
     <article className="office-record">Itens não verificados: {mini.counts.unverified}</article><article className="office-record">Mensagens registradas: {messages.length}</article>
     <article className="office-record">Relatórios de agentes registrados: {runs.length}</article></div></section></>}
 </main>;
}
export default function OfficeConsole({area='dashboard'}){
 return <SecuredWorkspace active={titleMap[area]||'Painel jurídico'}>{({db,session})=>
  process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1'&&area==='dashboard'
   ? <LexisDashboard db={db} session={session}/>
   : process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1'&&['clients','cases','reports'].includes(area)
   ? <LexisSharedOffice area={area} db={db} session={session}/>
   : process.env.NEXT_PUBLIC_LEXIS_SHARED_DB==='1'&&['deadlines','audiencias'].includes(area)
   ? <LexisOperations area={area} db={db} session={session}/>
   : <OfficeUI area={area} db={db} session={session}/>
 }</SecuredWorkspace>;
}
