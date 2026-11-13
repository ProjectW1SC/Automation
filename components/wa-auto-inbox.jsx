'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {archiveChats,archiveMessages,mergeChats,mergeMessages,messageState} from '../lib/wa-auto-archive.mjs';
import {ArrowLeft,CheckCircle2,ChevronDown,ExternalLink,Link2Off,LoaderCircle,MessageCircle,MessageSquare,Plus,RefreshCw,Search,Send,Settings2,ShieldCheck,Smartphone,Users,Wifi,WifiOff,X} from 'lucide-react';
const stamp=value=>{if(!value)return '';const d=new Date(value);return Number.isNaN(d.getTime())?'':d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})};
const tiny=value=>String(value||'').trim().slice(0,220);
const userName=c=>tiny(c?.name)||tiny(c?.phone)||tiny(c?.jid?.split('@')[0])||'Conversa';
const clock=value=>value?stamp(value).split(' ').pop():'';
export default function WaAutoInbox({db,userId}){
 const [status,setStatus]=useState(null),[chats,setChats]=useState([]),[messages,setMessages]=useState([]);
 const [selected,setSelected]=useState(null),[query,setQuery]=useState(''),[groups,setGroups]=useState(false);
 const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(''),[pairPhone,setPairPhone]=useState(''),[newPhone,setNewPhone]=useState('');
 const [showConnect,setShowConnect]=useState(false),[showNew,setShowNew]=useState(false),[qrImage,setQrImage]=useState('');
 const [lastSync,setLastSync]=useState(''),[archiveWarning,setArchiveWarning]=useState(''),[archiveAt,setArchiveAt]=useState('');
 const [syncUnsupported,setSyncUnsupported]=useState(false);
 const connected=status?.configured&&status?.connected;
 const connection=status?.connection||{};
 const api=useCallback(async(action,payload=null)=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)throw new Error('Sessão expirada. Entre novamente no CRM.');
  const post=payload!==null;
  const q=new URLSearchParams({action,...(!post?Object.fromEntries(Object.entries(payload||{}).map(([k,v])=>[k,String(v??'')])):{})});
  const response=await fetch('/api/office/whatsapp/bridge'+(post?'':'?'+q),{
    method:post?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    ...(post?{body:JSON.stringify({action,...payload})}:{}),cache:'no-store'
  });
  let body;try{body=await response.json()}catch{throw new Error('O servidor de WhatsApp retornou resposta inválida.')}
  if(!response.ok||!body?.ok)throw new Error(body?.error||'O WA.Auto não respondeu.');
  return body;
 },[db]);
 const reloadStatus=useCallback(async()=>{
  const body=await api('status');
  setStatus(body);setLastSync(new Date().toISOString());
  return body;
 },[api]);
 const loadArchiveChats=useCallback(async()=>{
  if(!userId)return [];
  const {data,error:err}=await db.from('office_wa_chat_archive')
    .select('jid,name,phone,is_group,last_message,last_message_at')
    .eq('owner_id',userId).order('last_message_at',{ascending:false}).limit(180);
  if(err){setArchiveWarning('Arquivo de conversas indisponível: '+err.message);return []}
  setChats(old=>mergeChats(old,data||[]));return data||[];
 },[db,userId]);
 const loadArchiveMessages=useCallback(async jid=>{
  if(!userId||!jid)return [];
  const {data,error:err}=await db.from('office_wa_message_archive')
   .select('provider_message_id,content,is_from_me,media_type,timestamp,ack,jid')
   .eq('owner_id',userId).eq('jid',jid).order('timestamp',{ascending:false}).limit(150);
  if(err){setArchiveWarning('Não foi possível ler as mensagens salvas: '+err.message);return []}
  const rows=(data||[]).map(item=>({...item,id:item.provider_message_id}));
  setMessages(old=>mergeMessages(old,rows));return rows;
 },[db,userId]);
 const persistArchive=useCallback(async(rawChats=[],rawMessages=[])=>{
  if(!userId)return;
  const chatsToSave=archiveChats(rawChats,userId),messagesToSave=archiveMessages(rawMessages,userId);
  // Insert missing chat parents without overwriting contact names during message-only sync.
  const parents=archiveChats(messagesToSave.map(m=>({jid:m.jid})),userId);
  if(parents.length){
   const {error:err}=await db.from('office_wa_chat_archive').upsert(parents,{onConflict:'owner_id,jid',ignoreDuplicates:true});
   if(err)throw Error('Não foi possível preparar histórico: '+err.message);
  }
  if(chatsToSave.length){
   const {error:err}=await db.from('office_wa_chat_archive').upsert(chatsToSave,{onConflict:'owner_id,jid'});
   if(err)throw Error('Não foi possível arquivar conversas: '+err.message);
  }
  if(messagesToSave.length){
   const {error:err}=await db.from('office_wa_message_archive').upsert(messagesToSave,{onConflict:'owner_id,jid,provider_message_id'});
   if(err)throw Error('Não foi possível arquivar mensagens: '+err.message);
  }
  if(chatsToSave.length||messagesToSave.length)setArchiveAt(new Date().toISOString());
 },[db,userId]);
 const reloadChats=useCallback(async(search='',onlyGroups=false)=>{
  const p=await api('chats',{q:search,onlyGroups:onlyGroups?'1':'0',limit:100});
  const rows=Array.isArray(p.chats)?p.chats:[];
  setChats(old=>mergeChats(old,rows));
  await persistArchive(rows,[]).catch(e=>setArchiveWarning(e.message));
  return p;
 },[api,persistArchive]);
 const reloadMessages=useCallback(async jid=>{
  if(!jid)return;
  const p=await api('messages',{jid,limit:100});
  const rows=Array.isArray(p.messages)?p.messages:[];
  setMessages(old=>mergeMessages(old,[...rows].reverse()));
  await persistArchive([],rows.map(x=>({...x,chat_jid:x.chat_jid||jid}))).catch(e=>setArchiveWarning(e.message));
 },[api,persistArchive]);
 const syncRecent=useCallback(async()=>{
  if(syncUnsupported)return;
  try{
   const p=await api('sync');
   const currentChats=Array.isArray(p.chats)?p.chats:[];
   const recentMessages=Array.isArray(p.messages)?p.messages:[];
   await persistArchive(currentChats,recentMessages);
   setChats(old=>mergeChats(old,currentChats));
   setMessages(old=>mergeMessages(old,recentMessages.filter(x=>x.chat_jid===selected?.jid)));
  }catch(e){if(/404|não permitida|not found|Operação não encontrada/i.test(e.message))setSyncUnsupported(true);else setArchiveWarning('Atualização recente indisponível: '+e.message)}
 },[api,persistArchive,selected?.jid,syncUnsupported]);
 useEffect(()=>{
  let alive=true;
  loadArchiveChats().catch(e=>{if(alive)setArchiveWarning(e.message)});
  reloadStatus().then(s=>{if(alive&&s.connected){reloadChats().catch(e=>{if(alive)setError(e.message)});}})
   .catch(e=>{if(alive)setError(e.message)});
  const id=window.setInterval(()=>{if(document.visibilityState==='visible')reloadStatus().catch(()=>setStatus(old=>old?{...old,connected:false}:old))},4000);
  return()=>{alive=false;window.clearInterval(id)};
 },[reloadStatus,reloadChats,loadArchiveChats]);
 useEffect(()=>{
  if(!connected)return;
  const id=window.setTimeout(()=>reloadChats(query,groups).catch(e=>setError(e.message)),350);
  return()=>window.clearTimeout(id);
 },[query,groups,connected,reloadChats]);
 useEffect(()=>{
  if(!selected?.jid){setMessages([]);return}
  let live=true;setMessages([]);
  loadArchiveMessages(selected.jid).catch(e=>{if(live)setArchiveWarning(e.message)});
  if(connected)reloadMessages(selected.jid).catch(e=>{if(live)setError(e.message)});
  return()=>{live=false};
 },[selected?.jid,connected,reloadMessages,loadArchiveMessages]);
 useEffect(()=>{
  const id=window.setInterval(()=>{
   if(document.visibilityState!=='visible')return;
   loadArchiveChats().catch(()=>{});
   if(selected?.jid)loadArchiveMessages(selected.jid).catch(()=>{});
   if(connected){reloadChats(query,groups).catch(()=>{});if(selected?.jid)reloadMessages(selected.jid).catch(()=>{});}
  },25000);
  return()=>window.clearInterval(id);
 },[loadArchiveChats,loadArchiveMessages,reloadChats,reloadMessages,selected?.jid,connected,query,groups]);
 useEffect(()=>{
  if(!connected||syncUnsupported)return;
  syncRecent();const id=window.setInterval(()=>{if(document.visibilityState==='visible')syncRecent()},45000);
  return()=>window.clearInterval(id);
 },[connected,syncRecent,syncUnsupported]);
 useEffect(()=>{
  let active=true;
  if(!connection.qr){setQrImage('');return}
  if(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(connection.qr))){setQrImage(String(connection.qr));return}
  import('qrcode').then(q=>q.default.toDataURL(String(connection.qr),{width:235,margin:1,errorCorrectionLevel:'M'})).then(url=>{if(active)setQrImage(url)}).catch(()=>{if(active)setQrImage('')});
  return()=>{active=false};
 },[connection.qr]);
 async function action(name,payload={}){
  if(busy)return;
  setBusy(name);setError('');setNotice('');
  try{
   const r=await api(name,payload);
   if(r.connection)setStatus(old=>({...old,configured:true,connected:r.connection.status==='ready',connection:r.connection}));
   await reloadStatus();
   if(name==='send'){
    setDraft('');setNotice('WA.Auto aceitou a mensagem. Entrega e leitura dependem da confirmação do WhatsApp.');
    const jid=selected?.jid;
    if(jid&&r.messageId){
     const echo={id:String(r.messageId),chat_jid:jid,content:String(payload.message||''),is_from_me:true,
       media_type:null,timestamp:new Date().toISOString(),ack:0};
     setMessages(old=>mergeMessages(old,[echo]));
     await persistArchive([current||{jid,name:jid.split('@')[0]}],[echo]).catch(e=>setArchiveWarning(e.message));
    }
    if(jid)await reloadMessages(jid).catch(e=>setArchiveWarning('Envio aceito; atualização de histórico indisponível: '+e.message));
    await reloadChats(query,groups).catch(()=>{});
   }
   else if(name==='logout'){setChats([]);setMessages([]);setSelected(null);setNotice('Aparelho desvinculado desta sessão.')}
   else setNotice(name==='connect'?'Solicitação de conexão enviada. Leia o QR quando aparecer.':'Pareamento iniciado. Confira o código no aparelho.');
  }catch(e){setError(e.message)}finally{setBusy('')}
 }
 function startChat(e){
  e.preventDefault();setError('');
  let phone=String(newPhone||'').replace(/\D/g,'');
  if(/^\d{10,11}$/.test(phone))phone='55'+phone;
  if(!/^55\d{10,11}$/.test(phone)){setError('Informe um telefone brasileiro com DDD.');return}
  setSelected({jid:phone+'@s.whatsapp.net',phone,name:phone});
  setNewPhone('');setShowNew(false);setMessages([]);
 }
 async function refresh(){
  if(busy)return;setBusy('refresh');setError('');
  try{await loadArchiveChats();if(selected?.jid)await loadArchiveMessages(selected.jid);const s=await reloadStatus();if(s.connected){await reloadChats(query,groups);if(selected?.jid)await reloadMessages(selected.jid);await syncRecent()}}
  catch(e){setError(e.message)}finally{setBusy('')}
 }
 const current=useMemo(()=>chats.find(c=>c.jid===selected?.jid)||selected,[chats,selected]);
 const visibleChats=useMemo(()=>chats.filter(c=>(!groups||c.is_group)&&
  [c.name,c.phone,c.jid].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))),[chats,groups,query]);
 return <main className="wa-workspace">
  <header className="wa-heading"><div><small>PROJECTW1SC / COMUNICAÇÃO</small><h1>WhatsApp <span>Workspace</span></h1><p>Uma sessão WhatsApp por usuário do CRM. Cada pessoa vincula seu próprio aparelho pelo QR Code; não existe número fixo do escritório.</p></div>
   <div className="wa-heading-actions">
    <span className={'wa-state '+(connected?'online':'offline')}><span className="wa-dot"/>{connected?'WhatsApp conectado':status?.configured?'Desconectado':'Aguardando configuração'}</span>
    <button className="wa-icon-btn" aria-label="Atualizar WhatsApp" type="button" disabled={!!busy} onClick={refresh}><RefreshCw size={17}/></button>
    <button className="wa-button" type="button" onClick={()=>setShowConnect(v=>!v)}><Smartphone size={16}/> Conexão</button>
   </div>
  </header>
  {error&&<div className="wa-alert error" role="alert">{error}<button type="button" aria-label="Fechar erro" onClick={()=>setError('')}><X size={15}/></button></div>}
  {archiveWarning&&<div className="wa-alert" role="status">{archiveWarning}<button type="button" aria-label="Fechar aviso de histórico" onClick={()=>setArchiveWarning('')}><X size={15}/></button></div>}
  {notice&&<div className="wa-alert" role="status"><CheckCircle2 size={17}/>{notice}</div>}
  {(!status?.configured||showConnect||!connected)&&<section className="wa-connection">
    <div className="wa-connection-title"><div className="wa-device-icon">{connected?<Wifi size={21}/>:<WifiOff size={21}/>}</div><div><strong>Seu WhatsApp · Conexão individual</strong><p>{status?.configured?tiny(connection.message)||'Sessão vinculada à sua conta do CRM.':'Serviço WA.Auto indisponível no servidor. Não informe credenciais nesta página.'}</p></div></div>
    {!status?.configured?<div className="wa-help">O servidor WhatsApp precisa estar disponível para gerar o QR. A identidade e as credenciais são verificadas no servidor; nunca cole tokens nesta página.</div>:<div className="wa-connect-content">
     {connected&&connection.account?.phone&&<p className="wa-linked-number">Número vinculado somente à sua conta: <strong>+{String(connection.account.phone).replace(/\D/g,'')}</strong></p>}
     {qrImage&&connection.status!=='ready'&&<div className="wa-qr"><img src={qrImage} alt="QR Code para vincular WhatsApp" width={235} height={235}/><small>Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho. QR vincula somente sua sessão.</small></div>}
     {connection.pairingCode&&<div className="wa-pair-code">Código de pareamento: <strong>{connection.pairingCode}</strong></div>}
     <div className="wa-connect-actions">
      {!connected&&<button type="button" className="wa-button" disabled={!!busy} onClick={()=>action('connect')}><Smartphone size={16}/> {busy==='connect'?'Conectando...':'Conectar por QR'}</button>}
      {!connected&&<form onSubmit={e=>{e.preventDefault();action('pair',{phone:pairPhone})}} className="wa-pair-form"><input aria-label="Telefone para pareamento" value={pairPhone} onChange={e=>setPairPhone(e.target.value)} placeholder="DDD + telefone" type="tel"/><button className="wa-button ghost" disabled={!!busy||!pairPhone.trim()}>Gerar código</button></form>}
      {connected&&<button type="button" className="wa-button danger" disabled={!!busy} onClick={()=>{if(window.confirm('Desvincular o aparelho desta sessão WhatsApp?'))action('logout')}}><Link2Off size={16}/> Desvincular</button>}
     </div>
     </div>}
     <div className="wa-disclaimer"><ShieldCheck size={15}/> Não criamos uma segunda sessão no navegador. O WA.Auto mantém o WhatsApp conectado no serviço cloud. Nada é enviado automaticamente.</div>
  </section>}
  <section className="wa-chat-layout" aria-label="Central de conversas">
   <aside className={'wa-contacts '+(current?'wa-mobile-hidden':'')}>
    <div className="wa-pane-header"><div><small>CAIXA DE ENTRADA</small><h2>Conversas <span>{visibleChats.length}</span></h2></div><button className="wa-icon-btn" type="button" onClick={()=>setShowNew(v=>!v)} title="Nova conversa" aria-label="Nova conversa"><Plus size={20}/></button></div>
    {showNew&&<form className="wa-new-chat" onSubmit={startChat}><label>Iniciar conversa por telefone</label><input type="tel" autoFocus value={newPhone} onChange={e=>setNewPhone(e.target.value)} placeholder="(11) 99999-9999" required/><button className="wa-button" type="submit">Abrir contato</button></form>}
    <label className="wa-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar contato ou telefone..." aria-label="Pesquisar conversas"/></label>
    <div className="wa-filters"><button aria-pressed={!groups} onClick={()=>setGroups(false)} type="button" className={!groups?'selected':''}>Todas</button><button aria-pressed={groups} onClick={()=>setGroups(true)} type="button" className={groups?'selected':''}><Users size={14}/> Grupos</button></div>
    <div className="wa-contact-list">{visibleChats.length?visibleChats.map(c=><button type="button" key={c.jid} className={'wa-contact '+(current?.jid===c.jid?'selected':'')} onClick={()=>setSelected(c)}><span className="wa-avatar">{userName(c).charAt(0).toUpperCase()}</span><span className="wa-contact-copy"><span className="wa-contact-title"><strong>{userName(c)}</strong><small>{clock(c.last_message_at)}</small></span><span className="wa-contact-message">{tiny(c.last_message)||c.phone||'Conversa disponível'}</span></span></button>):<div className="wa-empty"><Search size={22}/><strong>Nenhuma conversa encontrada</strong><p>Conversas anteriores continuam disponíveis quando salvas. Vincule o WhatsApp para receber novas mensagens.</p></div>}</div>
    <div className="wa-contact-footer">WA.Auto · histórico no CRM {archiveAt?'· salvo '+clock(archiveAt):''} {connected&&lastSync?'· conexão '+clock(lastSync):''}</div>
   </aside>
   <section className={'wa-conversation '+(!current?'wa-mobile-hidden':'')}>
    {current?<><div className="wa-conversation-header"><button type="button" className="wa-icon-btn wa-back" onClick={()=>setSelected(null)} aria-label="Voltar à lista"><ArrowLeft size={20}/></button><span className="wa-avatar">{userName(current).charAt(0).toUpperCase()}</span><div className="wa-conversation-heading"><strong>{userName(current)}</strong><small>{current.phone||current.jid} · {connected?'Conectado':'Histórico salvo · serviço offline'}</small></div><button type="button" className="wa-icon-btn" aria-label="Atualizar mensagens" onClick={()=>reloadMessages(current.jid).catch(e=>setError(e.message))}><RefreshCw size={16}/></button></div>
      <div className="wa-message-list" aria-live="polite">{messages.length?messages.map((m,i)=><div className={'wa-message '+(m.is_from_me?'outgoing':'incoming')} key={m.id||i}><div>{String(m.content||'').slice(0,4000)|| (m.media_type?'[Mídia: '+m.media_type+']':'[Mensagem sem texto]')}</div><small>{stamp(m.timestamp)}{m.is_from_me?' · '+messageState(m):''}</small></div>):<div className="wa-empty"><MessageCircle size={28}/><strong>Nenhuma mensagem nesta conversa</strong><p>Não há mensagens arquivadas para esta conversa. O histórico recebido por outros aparelhos depende do sincronismo do WhatsApp.</p></div>}</div>
      <form className="wa-composer" onSubmit={e=>{e.preventDefault();if(!draft.trim()||!connected)return;action('send',{to:current.is_group?current.jid:(current.phone||current.jid.split('@')[0]),message:draft.trim(),approved:true})}}><textarea aria-label="Mensagem WhatsApp" value={draft} maxLength={3000} rows={2} placeholder={connected?'Escreva sua mensagem...':'Histórico em leitura; conecte para enviar'} disabled={!connected||!!busy} onChange={e=>setDraft(e.target.value)}/><div className="wa-compose-footer"><small>Envio somente por clique. As mensagens salvas continuam legíveis no celular e PC através do CRM.</small><button className="wa-button" type="submit" disabled={!connected||!draft.trim()||!!busy}><Send size={16}/> {busy==='send'?'Enviando...':'Enviar'}</button></div></form>
     </>:<div className="wa-no-chat"><div className="wa-no-chat-art"><MessageSquare size={52}/></div><h2>Um espaço para cada conversa</h2><p>Escolha um contato ao lado, consulte o histórico e responda sem sair do CRM.</p><div><ShieldCheck size={16}/> Conversas do WA.Auto, sem integração oficial da Meta</div></div>}
   </section>
  </section>
 </main>
}
