'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {parseExcelSheets} from '../lib/excel.mjs';
import {isFinalizedClient,finalizedClients,reopenClientPatch} from '../lib/finalizados.mjs';
import {queueCounts,todayBrazil,validateCriticidade,validateNote} from '../lib/tarefas.mjs';
import CrmShell from '../components/crm-shell';
import ReferencePages from '../components/reference-pages';
import InstitutionLogo from '../components/institution-logo';
import {normalizeInstitutionName} from '../lib/institution-brands.mjs';
import {validateImageFile} from '../lib/appearance-settings.mjs';
import {crmAreaHref,areaFromQuery} from '../lib/crm-navigation.mjs';
import {getClient} from '../lib/supabase-client';
import {ADMIN_EMAIL,signInWithPassword as passwordLogin,sendRecovery,changePassword,isRecoveryRateLimit,canRequestRecovery,RECOVERY_COOLDOWN_MS} from '../lib/login.mjs';
const RECOVERY_LOCK_KEY='projectw1sc:recovery-until';
const labelStatus={em_andamento:'Em andamento',vencido:'Vencido',quitado_na_planilha:'Quitado na planilha',finalizado_na_planilha:'Finalizado na planilha',historico:'Histórico',revisar:'Revisar'};
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const date=x=>x?new Date(x+'T12:00:00').toLocaleDateString('pt-BR'):'—';
const txt=x=>x??'—';
export default function Page(){
 const uploadRef=useRef(null);const db=getClient(),[session,setSession]=useState(null),[password,setPassword]=useState(''),[recoveryPassword,setRecoveryPassword]=useState(''),[recoveryMode,setRecoveryMode]=useState(false),[showPassword,setShowPassword]=useState(false),[recoveryUntil,setRecoveryUntil]=useState(0),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [createDialog,setCreateDialog]=useState(null),[newClient,setNewClient]=useState({name:'',document:'',institution:''}),[newParty,setNewParty]=useState({name:'',kind:'financeira',contact:''}),[editParty,setEditParty]=useState(null),[logoFile,setLogoFile]=useState(null),[logoPreview,setLogoPreview]=useState(''),[logoRemove,setLogoRemove]=useState(false),[partyLogos,setPartyLogos]=useState({});
 const [unmatched,setUnmatched]=useState([]),[statusFilter,setStatusFilter]=useState('todos'),[page,setPage]=useState('Visão geral'),[clients,setClients]=useState([]),[parties,setParties]=useState([]),[runs,setRuns]=useState([]),[query,setQuery]=useState(''),[filter,setFilter]=useState('todos'),[selected,setSelected]=useState(null),[stage,setStage]=useState(''),[evidence,setEvidence]=useState(''),[evidenceUrl,setEvidenceUrl]=useState(''),[note,setNote]=useState(''),[criticidade,setCriticidade]=useState('normal'),[activities,setActivities]=useState([]),[updated,setUpdated]=useState(null),[reopenTarget,setReopenTarget]=useState(null),[reopenReason,setReopenReason]=useState('');
 useEffect(()=>{
  if(!db)return;
  setRecoveryUntil(Number(window.sessionStorage.getItem(RECOVERY_LOCK_KEY)||0));
  let alive=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((event,s)=>{
   if(!alive)return;
   setSession(s);
   if(event==='PASSWORD_RECOVERY')setRecoveryMode(true);
  });
  db.auth.getSession().then(({data,error})=>{
   if(alive){if(error)setNotice('Não foi possível recuperar a sessão.');else setSession(data.session)}
  });
  // Suporta links de recuperação com token_hash, além do fluxo automático do SDK.
  const url=new URL(window.location.href);
  const fragment=new URLSearchParams(url.hash.replace(/^#/,''));
  const isRecovery=url.searchParams.get('type')==='recovery'||fragment.get('type')==='recovery';
  if(isRecovery)setRecoveryMode(true);
  const tokenHash=url.searchParams.get('token_hash');
  if(isRecovery&&tokenHash){
   db.auth.verifyOtp({type:'recovery',token_hash:tokenHash}).then(({error})=>{
    if(!alive)return;
    if(error)setNotice('O link de recuperação expirou. Solicite outro na tela de acesso.');
   }).finally(()=>window.history.replaceState({},'',window.location.pathname));
  }
  return()=>{alive=false;subscription.unsubscribe()};
 },[db]);
 async function load(){if(!db)return;setBusy(true);const [a,b,c,d]=await Promise.all([db.from('crm_clients').select('*').order('name').limit(1000),db.from('crm_parties').select('*').order('name'),db.from('crm_import_runs').select('id,status,started_at,finished_at,rows_read,clients_merged,error').order('started_at',{ascending:false}).limit(10),db.from('crm_unmatched_sources').select('source_ref,client_name,source_tab,reason').order('created_at',{ascending:false}).limit(700)]);if(a.error)setNotice('Erro ao consultar dados: '+a.error.message);else{setClients(a.data||[]);setUpdated(new Date())}if(!b.error){
  const entries=b.data||[];setParties(entries);
  const uploaded=entries.filter(x=>x.logo_path);
  if(uploaded.length){
   const {data:urls,error}=await db.storage.from('crm-institution-logos').createSignedUrls(uploaded.map(x=>x.logo_path),3600);
   if(!error){
    const map={};(urls||[]).forEach((u,i)=>{if(u?.signedUrl)map[normalizeInstitutionName(uploaded[i].name)]=u.signedUrl});
    setPartyLogos(map);
   }else{setPartyLogos({});setNotice('Cadastros carregados, mas as imagens particulares das instituições não puderam ser consultadas.')}
  }else setPartyLogos({});
 }if(!c.error)setRuns(c.data||[]);if(!d.error)setUnmatched(d.data||[]);setBusy(false)}
 useEffect(()=>{if(session)load();else{setClients([]);setParties([])}},[session]);
 useEffect(()=>{
  const syncLocation=()=>{
   setPage(areaFromQuery(window.location.search));
   if(new URLSearchParams(window.location.search).get('senha')==='1')setRecoveryMode(true);
  };
  syncLocation();
  window.addEventListener('popstate',syncLocation);
  return()=>window.removeEventListener('popstate',syncLocation);
 },[]);
 function changeArea(label){
  setPage(label);setQuery('');setFilter('todos');setStatusFilter('todos');
  window.history.pushState({},'',crmAreaHref(label));
 }

 const shown=useMemo(()=>clients.filter(c=>{if(page==='Vencidos'&&c.source_status!=='vencido')return false;if(page==='Quitações'&&!c.source_status.includes('quitado')&&c.evidence_status!=='quitacao_verificada')return false;if(page==='Finalizados'&&!isFinalizedClient(c))return false;if(statusFilter!=='todos'&&c.source_status!==statusFilter)return false;if(filter!=='todos'&&c.stage!==filter)return false;let q=query.toLowerCase().trim();return !q||[c.name,c.institution,c.contacted_party,c.phone,c.consultant].some(x=>String(x||'').toLowerCase().includes(q))} ),[clients,page,filter,query,statusFilter]);
 const today=todayBrazil();
 const queueSummary=useMemo(()=>queueCounts(clients,today),[clients,today]);
 const kpis={all:clients.length,vencidos:queueSummary.vencido,quitados:clients.filter(c=>c.source_status==='quitado_na_planilha').length,verify:clients.filter(c=>c.evidence_status==='quitacao_verificada').length,conflicts:clients.filter(c=>c.source_conflict).length,overdue:queueSummary.vencido,finalizados:queueSummary.finalizado};

 async function createManualClient(e){
  e.preventDefault();if(!db||busy)return;setBusy(true);setNotice('');
  const {error}=await db.rpc('crm_create_client',{p_name:newClient.name.trim(),p_document:newClient.document,p_institution:newClient.institution.trim()||null});
  if(error){setNotice('Não foi possível cadastrar: '+error.message);setBusy(false);return}
  setCreateDialog(null);setNewClient({name:'',document:'',institution:''});
  await load();setNotice('Cliente cadastrado com histórico de origem manual.');setBusy(false);
 }
 async function createInstitution(e){
  e.preventDefault();if(!db||busy)return;
  const name=newParty.name.trim();const contact=newParty.contact.trim();
  if(name.length<2||name.length>200){setNotice('Informe o nome da instituição.');return}
  setBusy(true);
  const {error}=await db.from('crm_parties').upsert({name,kind:newParty.kind,contact:contact||null,updated_at:new Date().toISOString()},{onConflict:'name,kind'});
  if(error){setNotice('Não foi possível cadastrar instituição: '+error.message);setBusy(false);return}
  setCreateDialog(null);setNewParty({name:'',kind:'financeira',contact:''});
  await load();setNotice('Instituição salva no CRM.');setBusy(false);
 }
 function openInstitution(p){setEditParty({...p});setLogoFile(null);setLogoRemove(false)}
 async function saveInstitution(e){
  e.preventDefault();if(!editParty||busy)return;
  try{if(logoFile)validateImageFile(logoFile,'logo')}catch(err){setNotice(err.message);return}
  setBusy(true);setNotice('');
  const previous=editParty.logo_path||null;
  let path=null;
  try{
   if(logoFile){
    const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[logoFile.type];
    path='parties/'+editParty.id+'/'+crypto.randomUUID()+'.'+ext;
    const {error}=await db.storage.from('crm-institution-logos').upload(path,logoFile,{contentType:logoFile.type,cacheControl:'3600',upsert:false});
    if(error)throw Error('Falha ao armazenar imagem: '+error.message);
   }
   const payload={contact:editParty.contact?.trim()||null,logo_path:logoRemove?null:path||previous,updated_at:new Date().toISOString()};
   const {error,data}=await db.from('crm_parties').update(payload).eq('id',editParty.id).select('id');
   if(error||!data?.length)throw Error(error?.message||'Não foi possível atualizar esta instituição.');
   if(previous&&(logoRemove||path))await db.storage.from('crm-institution-logos').remove([previous]);
   setEditParty(null);setLogoFile(null);setLogoRemove(false);
   await load();setNotice('Instituição atualizada. A imagem personalizada já está disponível na carteira.');
  }catch(err){
   if(path)await db.storage.from('crm-institution-logos').remove([path]).catch(()=>{});
   setNotice('Imagem não salva: '+err.message);
  }finally{setBusy(false)}
 }
 useEffect(()=>{
  if(!logoFile){setLogoPreview('');return}
  const url=URL.createObjectURL(logoFile);setLogoPreview(url);
  return()=>URL.revokeObjectURL(url);
 },[logoFile]);
   const last=runs[0];
 async function importExcel(event){const file=event.target.files?.[0];if(!file)return;if(!file.name.toLowerCase().endsWith('.xlsx')){setNotice('Selecione uma planilha .xlsx.');return;}setBusy(true);setNotice('Lendo a planilha e conferindo os documentos...');try{const {default:readExcelFile}=await import('read-excel-file/browser');const sheets=await readExcelFile(file);const parsed=parseExcelSheets(sheets,file.name);let accepted=0,rejected=0;for(let i=0;i<parsed.rows.length;i+=100){const {data,error}=await db.rpc('crm_import_excel',{p_rows:parsed.rows.slice(i,i+100)});if(error)throw Error(error.message);accepted+=(data?.processed||0);rejected+=(data?.need_review||0);}if(parsed.parties.length){const {error}=await db.from('crm_parties').upsert(parsed.parties,{onConflict:'name,kind'});if(error)throw Error('Clientes importados, mas a agenda de financeiras falhou: '+error.message);}setNotice('Importação concluída: '+accepted+' registros associados por CPF/CNPJ; '+rejected+' separados para revisão. Nenhuma quitação foi marcada como comprovada automaticamente.');await load()}catch(e){setNotice('Erro na importação: '+e.message)}finally{setBusy(false);if(uploadRef.current)uploadRef.current.value='';}}
 async function signIn(e){
  e.preventDefault();setBusy(true);setNotice('');
  try{
   await passwordLogin(db.auth,password);
   setPassword('');setNotice('');
  }catch(err){setNotice(err.message)}
  finally{setBusy(false)}
 }
 async function recover(){
  if(!canRequestRecovery(recoveryUntil)){
    setNotice('O envio de e-mails está temporariamente bloqueado. Não clique repetidamente; acesse o Supabase para redefinir a senha como administrador.');
    return;
  }
  setBusy(true);setNotice('');
  try{
   await sendRecovery(db.auth,window.location.origin);
   const until=Date.now()+60*1000;
   setRecoveryUntil(until);
   window.sessionStorage.setItem(RECOVERY_LOCK_KEY,String(until));
   setNotice('Pedido enviado. Confira o e-mail. Não solicite novos links repetidamente.');
  }catch(err){
   if(isRecoveryRateLimit(err)){
    const until=Date.now()+RECOVERY_COOLDOWN_MS;
    setRecoveryUntil(until);
    window.sessionStorage.setItem(RECOVERY_LOCK_KEY,String(until));
   }
   setNotice(err.message);
  }finally{setBusy(false)}
 }
 async function saveRecoveredPassword(e){
  e.preventDefault();setBusy(true);setNotice('');
  try{
   await changePassword(db.auth,recoveryPassword);
   setRecoveryPassword('');setRecoveryMode(false);
   setNotice('Senha atualizada. Seu acesso está liberado.');
  }catch(err){setNotice(err.message)}
  finally{setBusy(false)}
 }
 async function sync(){setBusy(true);try{const token=session?.access_token;if(!token)throw Error('Login necessário');const r=await fetch('/api/sync',{method:'POST',headers:{Authorization:'Bearer '+token}});const j=await r.json();if(!r.ok)throw Error(j.error||'Falha na importação');setNotice('Importação concluída: '+j.clients+' clientes. Fontes: '+j.sources.map(x=>x.tab+': '+x.rows).join(', '));await load()}catch(e){setNotice(e.message)}finally{setBusy(false)}}
 async function reopenClient(e){
  e.preventDefault();if(!db||!reopenTarget||busy)return;
  let patch;try{patch=reopenClientPatch(reopenTarget,reopenReason)}catch(err){setNotice(err.message);return}
  setBusy(true);setNotice('');
  const {error}=await db.rpc('crm_update_client',{p_client_id:reopenTarget.id,p_patch:patch,p_reason:reopenReason.trim()});
  if(error){setNotice('Não foi possível reabrir: '+error.message);setBusy(false);return}
  setReopenTarget(null);setReopenReason('');
  await load();setNotice('Acompanhamento reaberto e registrado no histórico. Ele voltou à fila de Tarefas.');
  setBusy(false);
 }
 
 async function openClient(c){setSelected(c);setStage(c.stage);setEvidence(c.evidence_status);setEvidenceUrl(c.evidence_url||'');setNote('');setCriticidade(c.priority_level||'normal');const r=await db.from('crm_activities').select('id,kind,body,created_at').eq('client_id',c.id).order('created_at',{ascending:false}).limit(40);setActivities(r.data||[])}
 async function save(){
  if(!selected||busy)return;
  let priority,annotation='';
  try{priority=validateCriticidade(criticidade);if(note.trim())annotation=validateNote(note)}
  catch(err){setNotice(err.message);return}
  const prev=selected;
  const data={stage,evidence_status:evidence,evidence_url:evidenceUrl.trim()||null,priority_level:priority};
  if(evidence==='quitacao_verificada'){
   if(!data.evidence_url){setNotice('Para confirmar quitação, informe o link do comprovante individual.');return}
   data.verified_at=new Date().toISOString();data.verified_by=session.user.id
  }else{data.verified_at=null;data.verified_by=null}
  setBusy(true);setNotice('');
  const result=await db.from('crm_clients').update(data).eq('id',selected.id).select('id');
  if(result.error||!result.data?.length){setNotice(result.error?.message||'Nenhuma alteração foi autorizada para o cliente.');setBusy(false);return}
  let historyWarning='';
  if(annotation){
   const {error}=await db.rpc('crm_add_client_note',{p_client_id:selected.id,p_body:annotation});
   if(error)historyWarning=' A ficha foi atualizada, mas a anotação não foi registrada: '+error.message;
  }
  if(prev.stage!==stage||prev.evidence_status!==evidence||prev.priority_level!==priority){
   const details={etapa_anterior:prev.stage,etapa_atual:stage,
    criticidade_anterior:prev.priority_level||'normal',criticidade_atual:priority,
    evidencia_anterior:prev.evidence_status,evidencia_atual:evidence};
   const {error}=await db.from('crm_activities').insert({client_id:selected.id,kind:'alteracao',body:'Etapa: '+stage+' · Evidência: '+evidence+' · Criticidade: '+priority,details,actor_id:session.user.id});
   if(error)historyWarning+=' O histórico da alteração não pôde ser registrado.';
  }
  setSelected(null);setBusy(false);setNotice('Registro atualizado.'+historyWarning);load();
 }
 if(!db)return <div className="login"><div className="eyebrow">ProjectW1SC</div><h1>CRM em configuração</h1><p>Configure as variáveis do Supabase no ambiente de implantação para habilitar o login e os dados privados. Nenhuma informação de cliente será exibida sem autenticação.</p></div>;
 if(recoveryMode&&session)return <div className="login"><div className="eyebrow">PROJECTW1SC / ACESSO SEGURO</div><h1>Definir senha</h1><p>Escolha uma nova senha para acessar o CRM. Ela será armazenada com segurança no Supabase, nunca neste site.</p><form onSubmit={saveRecoveredPassword}><label htmlFor="new-password" className="muted">Nova senha</label><input id="new-password" required autoComplete="new-password" minLength={8} type="password" className="input" placeholder="Pelo menos 8 caracteres" value={recoveryPassword} onChange={e=>setRecoveryPassword(e.target.value)}/><button className="btn" disabled={busy}>{busy?'Salvando...':'Salvar senha e entrar'}</button></form><button type="button" className="btn ghost" style={{marginTop:12}} onClick={()=>setRecoveryMode(false)}>Cancelar</button>{notice&&<p role="status">{notice}</p>}</div>;
 if(!session)return <div className="login"><div className="eyebrow">PROJECTW1SC / ÁREA RESTRITA</div><h1>Entrar no CRM</h1><p>Use o e-mail da ProjectW1SC e sua senha. Não precisa solicitar um link para entrar.</p><form onSubmit={signIn}><label htmlFor="admin-email" className="muted">E-mail autorizado</label><input id="admin-email" type="email" readOnly className="input" value={ADMIN_EMAIL}/><label htmlFor="admin-password" className="muted">Senha</label><input id="admin-password" required autoComplete="current-password" minLength={8} type={showPassword?'text':'password'} className="input" placeholder="Digite sua senha" value={password} onChange={e=>setPassword(e.target.value)}/><div style={{display:'flex',gap:12,alignItems:'center',margin:'2px 0 16px'}}><label className="muted" style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/> Mostrar senha</label></div><button className="btn" disabled={busy}>{busy?'Entrando...':'Entrar no CRM'}</button></form><button type="button" className="btn ghost" style={{marginTop:14}} disabled={busy||!canRequestRecovery(recoveryUntil)} onClick={recover}>{canRequestRecovery(recoveryUntil)?'Recuperar senha por e-mail':'Envio de e-mails temporariamente bloqueado'}</button><p className="muted" style={{margin:'14px 0 0',fontSize:12}}>O administrador pode definir uma nova senha sem solicitar outro e-mail: <a style={{fontWeight:700,textDecoration:'underline'}} href="https://supabase.com/dashboard/project/ulkuhiibeoibbzhqrfya/auth/users" target="_blank" rel="noopener noreferrer">abrir usuários no Supabase</a>.</p>{notice&&<p role="status" className={/erro|incorret|expir|falha|limite|não foi possível|não retornou/i.test(notice)?'error':''}>{notice}</p>}</div>;
 return <CrmShell active={page} email={session.user.email||''} onNavigate={changeArea} onSignOut={()=>db.auth.signOut()} onPassword={()=>{setRecoveryMode(true);setRecoveryPassword('')}}>
 <input ref={uploadRef} type="file" accept=".xlsx" hidden onChange={importExcel}/>
 <ReferencePages page={page} clients={clients} parties={parties} kpis={kpis} last={last} updated={updated} busy={busy}
  onRefresh={load} onImport={()=>uploadRef.current?.click()}
  onGo={label=>{if(label==='Tarefas')window.location.href='/tarefas';else if(label==='Minhas atividades')window.location.href='/minhas-atividades';else changeArea(label)}}
  onSelectClient={openClient} partyLogos={partyLogos} onEditInstitution={openInstitution} onReopen={c=>{setReopenTarget(c);setReopenReason('')}}
  onCreate={()=>setCreateDialog('client')} onCreateClient={()=>setCreateDialog('client')} onCreateParty={()=>setCreateDialog('party')}/>
 {notice&&<div className="reference-floating-notice" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Fechar">×</button></div>}
 {createDialog&&<div className="dialog" role="presentation" onClick={e=>{if(e.target===e.currentTarget&&!busy)setCreateDialog(null)}}>
   <form className="dialog-inner reference-creation-modal" onSubmit={createDialog==='client'?createManualClient:createInstitution}>
    <div className="reference-row-between"><h2>{createDialog==='client'?'Novo registro de cliente':'Nova instituição'}</h2><button type="button" className="reference-outline" onClick={()=>setCreateDialog(null)}>Fechar</button></div>
    {createDialog==='client'?<>
     <label>Nome completo *<input required minLength={3} maxLength={250} value={newClient.name} onChange={e=>setNewClient(x=>({...x,name:e.target.value}))}/></label>
     <label>CPF/CNPJ *<input required minLength={11} maxLength={24} value={newClient.document} onChange={e=>setNewClient(x=>({...x,document:e.target.value}))} placeholder="Somente cadastro identificado por documento"/></label>
     <label>Financeira / instituição<input maxLength={200} value={newClient.institution} onChange={e=>setNewClient(x=>({...x,institution:e.target.value}))}/></label>
     <p>O registro será identificado por CPF/CNPJ para evitar duplicidade e manter a conciliação.</p>
    </>:<>
     <label>Nome da instituição *<input required minLength={2} maxLength={200} value={newParty.name} onChange={e=>setNewParty(x=>({...x,name:e.target.value}))}/></label>
     <label>Categoria<select value={newParty.kind} onChange={e=>setNewParty(x=>({...x,kind:e.target.value}))}><option value="financeira">Financeira</option><option value="assessoria">Assessoria</option><option value="escritorio">Escritório</option><option value="base">Base de contatos</option></select></label>
     <label>Contato principal<input maxLength={300} value={newParty.contact} onChange={e=>setNewParty(x=>({...x,contact:e.target.value}))}/></label>
    </>}
    <div className="reference-actions"><button type="button" className="reference-outline" onClick={()=>setCreateDialog(null)}>Cancelar</button><button type="submit" disabled={busy} className="reference-primary">{busy?'Salvando...':'Salvar cadastro'}</button></div>
   </form>
 </div>}

 {editParty&&<div className="dialog" role="presentation" onClick={e=>{if(e.target===e.currentTarget&&!busy)setEditParty(null)}}>
  <form className="dialog-inner institution-logo-editor" onSubmit={saveInstitution} aria-label="Editar identidade visual da instituição">
   <div className="top"><div><div className="eyebrow">INSTITUIÇÃO / IDENTIDADE VISUAL</div><h2>{editParty.name}</h2></div><button type="button" className="btn ghost" disabled={busy} onClick={()=>setEditParty(null)}>Fechar</button></div>
   <div className="institution-edit-preview"><InstitutionLogo name={editParty.name} size="lg" customUrl={logoRemove?'':logoPreview||partyLogos[normalizeInstitutionName(editParty.name)]||''} showName/><p>Você pode usar a marca oficial reconhecida, enviar um arquivo próprio ou manter o monograma automático.</p></div>
   <label>Contato principal<input className="input" value={editParty.contact||''} maxLength={350} onChange={e=>setEditParty(x=>({...x,contact:e.target.value}))}/></label>
   <label className="reference-outline institution-image-picker">Escolher imagem JPG, PNG ou WebP (até 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(!file)return;try{validateImageFile(file,'logo');setLogoFile(file);setLogoRemove(false);setNotice('')}catch(err){setNotice(err.message)}e.target.value=''}}/></label>
   <div className="institution-edit-actions"><button type="button" className="reference-outline" disabled={busy} onClick={()=>{setLogoRemove(true);setLogoFile(null)}}>Remover imagem personalizada</button><button type="submit" className="reference-primary" disabled={busy}>{busy?'Salvando...':'Salvar instituição'}</button></div>
  </form>
 </div>}
  {selected&&<div className="dialog" role="dialog" aria-modal="true"><div className="dialog-inner"><div className="top"><div><div className="eyebrow">FICHA DE NEGOCIAÇÃO</div><h2>{selected.name}</h2></div><button className="btn ghost" onClick={()=>setSelected(null)}>Fechar</button></div><div className="details"><div><b>Instituição</b><span>{txt(selected.institution)}</span></div><div><b>Contato (coluna T)</b><span>{txt(selected.contacted_party)}</span></div><div><b>Telefone</b><span>{txt(selected.phone)}</span></div><div><b>Consultor</b><span>{txt(selected.consultant)}</span></div><div><b>Origem</b><span>{selected.source_tabs?.join(' · ')}</span></div><div><b>Próximo retorno</b><span>{date(selected.next_return)}</span></div><div><b>Saldo devedor</b><span>{selected.debtor_balance==null?'—':BRL.format(Number(selected.debtor_balance))}</span></div><div><b>Valor atual</b><span>{selected.current_amount==null?'—':BRL.format(Number(selected.current_amount))}</span></div></div><div className="form-row"><label>Etapa da negociação<select className="input" value={stage} onChange={e=>setStage(e.target.value)}>{['a_analisar','contatado','em_negociacao','proposta_enviada','aguardando_resposta','concluido','arquivado'].map(x=><option value={x} key={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Verificação documental<select className="input" value={evidence} onChange={e=>setEvidence(e.target.value)}><option value="sem_validacao">Sem validação</option><option value="comprovante_recebido">Comprovante recebido</option><option value="quitacao_verificada">Quitação verificada</option><option value="divergente">Divergente</option></select></label></div><div className="form-row"><label>Nível de criticidade<select className="input" value={criticidade} onChange={e=>setCriticidade(e.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label></div><div className="form-row"><label>Link privado do comprovante<input className="input" value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} placeholder="Link de acesso restrito"/></label></div><div className="form-row"><label>Nova anotação<textarea className="input" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Anotação interna sobre a negociação (não conta como atendimento)"/></label></div><div className="actions" style={{marginTop:18}}><button className="btn" disabled={busy} onClick={save}>Salvar alterações</button></div><h2>Histórico</h2>{activities.length?activities.map(a=><p key={a.id}><span className="muted">{new Date(a.created_at).toLocaleString('pt-BR')} · {a.kind}</span><div>{a.body}</div></p>):<p>Sem atividades registradas.</p>}</div></div>}
 {reopenTarget&&<div className="dialog" role="dialog" aria-modal="true" aria-label="Reabrir acompanhamento" onClick={e=>{if(e.target===e.currentTarget&&!busy)setReopenTarget(null)}}>
  <form className="dialog-inner crm-reopen-modal" onSubmit={reopenClient}>
   <div className="top"><div><div className="eyebrow">FINALIZADOS / REABERTURA</div><h2>Reabrir acompanhamento</h2></div><button type="button" className="btn ghost" onClick={()=>setReopenTarget(null)} disabled={busy}>Fechar</button></div>
   <p><strong>{reopenTarget.name}</strong></p>
   <p>O cliente voltará à fila de tarefas, sem alterar os registros financeiros ou apagar o histórico da finalização.</p>
   <label className="crm-reopen-label" htmlFor="crm-reopen-reason">Motivo da reabertura</label>
   <textarea id="crm-reopen-reason" className="input" required minLength={3} maxLength={2000} rows={3} value={reopenReason} onChange={e=>setReopenReason(e.target.value)} placeholder="Ex.: cliente retornou para retomar a negociação"/>
   <div className="actions"><button type="button" className="btn ghost" onClick={()=>setReopenTarget(null)} disabled={busy}>Cancelar</button><button className="btn" type="submit" disabled={busy||reopenReason.trim().length<3}>{busy?'Salvando...':'Confirmar reabertura'}</button></div>
  </form>
 </div>}
 </CrmShell>;
}
