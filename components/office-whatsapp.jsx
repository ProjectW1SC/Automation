'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {MessageCircle,Search,RefreshCw,QrCode,Send,UserRound,BriefcaseBusiness,Phone,CheckCircle2,Clock3,Wifi,WifiOff,X,ExternalLink,ShieldCheck} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
const digits=v=>String(v||'').replace(/\D/g,'');
const phoneKey=v=>{const n=digits(v);return n.length===10||n.length===11?'55'+n:n};
function prettyPhone(v){const n=phoneKey(v);if(n.length===13)return '+55 ('+n.slice(2,4)+') '+n.slice(4,9)+'-'+n.slice(9);if(n.length===12)return '+55 ('+n.slice(2,4)+') '+n.slice(4,8)+'-'+n.slice(8);return v||'Telefone não cadastrado'}
const time=v=>{try{return new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}};
const day=v=>{try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(v))}catch{return ''}};
function Inbox({db,session}){
 const [messages,setMessages]=useState([]),[clients,setClients]=useState([]),[cases,setCases]=useState([]);
 const [selectedPhone,setSelectedPhone]=useState(''),[search,setSearch]=useState(''),[draft,setDraft]=useState('');
 const [status,setStatus]=useState({configured:false,connected:false,status:'unconfigured'});
 const [qrOpen,setQrOpen]=useState(false),[confirmSend,setConfirmSend]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [lastError,setLastError]=useState('');
 const load=useCallback(async()=>{
  try{
   const [m,c]=await Promise.all([
    withAuthDeadline(db.from('office_whatsapp_messages').select('id,client_id,phone,display_name,direction,body,received_at,status,provider_status').eq('owner_id',session.user.id).order('received_at',{ascending:true}).limit(900),12000),
    withAuthDeadline(db.from('office_clients').select('id,name,phone,email,status,responsible').eq('owner_id',session.user.id).order('name',{ascending:true}).limit(800),12000)
   ]);
   if(m.error)throw m.error;if(c.error)throw c.error;
   setMessages(m.data||[]);setClients(c.data||[]);
   setLastError('');
  }catch(e){setLastError('Não foi possível carregar as conversas: '+e.message)}
  finally{setLoading(false)}
 },[db,session.user.id]);
 const refreshStatus=useCallback(async()=>{
  try{
   const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)return;
   const r=await fetch('/api/office/whatsapp/bridge?action=status',{headers:{Authorization:'Bearer '+s.access_token},cache:'no-store'});
   const p=await r.json();if(p?.ok)setStatus(p);else setStatus(x=>({...x,status:'offline',error:p?.error||'Status indisponível'}));
  }catch(e){setStatus(x=>({...x,status:'offline',error:e.message}))}
 },[db]);
 useEffect(()=>{load();refreshStatus()},[load,refreshStatus]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{load();if(qrOpen||!status.connected)refreshStatus()},8000);
  return()=>window.clearInterval(timer);
 },[load,refreshStatus,qrOpen,status.connected]);
 const contacts=useMemo(()=>{
  const map=new Map();
  for(const msg of messages){
   const key=phoneKey(msg.phone);if(!key)continue;
   const row=map.get(key)||{phone:key,messages:[],last:null,client:null};
   row.messages.push(msg);row.last=msg;map.set(key,row);
  }
  for(const client of clients){
   const key=phoneKey(client.phone);if(!key)continue;
   const row=map.get(key)||{phone:key,messages:[],last:null,client:null};
   row.client=client;map.set(key,row);
  }
  return [...map.values()].map(row=>({...row,client:row.client||clients.find(c=>phoneKey(c.phone)===row.phone)||null}))
   .sort((a,b)=>String(b.last?.received_at||'').localeCompare(String(a.last?.received_at||'')));
 },[messages,clients]);
 const filtered=contacts.filter(c=>{
  const name=c.client?.name||c.last?.display_name||'';
  return (name+' '+c.phone).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'));
 });
 useEffect(()=>{if(!selectedPhone&&contacts.length)setSelectedPhone(contacts[0].phone)},[contacts,selectedPhone]);
 const activeContact=contacts.find(c=>c.phone===selectedPhone)||null;
 const thread=messages.filter(m=>phoneKey(m.phone)===selectedPhone);
 const client=activeContact?.client||null;
 const selectedCase=cases.filter(c=>c.client_id===client?.id);
 useEffect(()=>{
  let alive=true;
  async function loadCases(){
   if(!client?.id){setCases([]);return}
   const {data,error}=await withAuthDeadline(db.from('office_cases').select('id,title,process_number,status,tribunal').eq('owner_id',session.user.id).eq('client_id',client.id).limit(80),9000);
   if(alive)setCases(error?[]:(data||[]));
  }
  loadCases();return()=>{alive=false}
 },[db,session.user.id,client?.id]);
 async function connect(){
  setBusy(true);setNotice('Solicitando conexão ao serviço de WhatsApp...');
  try{
   const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)throw Error('Sessão expirada.');
   const r=await fetch('/api/office/whatsapp/bridge',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify({action:'connect'})});
   const p=await r.json();if(!p.ok)throw Error(p.error||'Não foi possível iniciar a conexão.');
   setStatus(p);setQrOpen(true);setNotice('Aguardando o QR Code do WhatsApp.');
   await refreshStatus();
  }catch(e){setNotice(e.message)}
  finally{setBusy(false)}
 }
 async function send(e){
  e.preventDefault();if(busy||!draft.trim()||!selectedPhone||!status.connected||!confirmSend)return;
  setBusy(true);setNotice('');
  try{
   const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)throw Error('Sessão expirada.');
   const r=await fetch('/api/office/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},
    body:JSON.stringify({to:selectedPhone,message:draft.trim(),approved:true,client_id:client?.id||null})});
   const p=await r.json();if(!p.ok||!p.accepted)throw Error(p.error||'O WhatsApp não aceitou a mensagem.');
   setDraft('');setConfirmSend(false);setNotice(p.warning||'WhatsApp aceitou a mensagem. A entrega ainda depende da confirmação do aparelho.');
   await load();
  }catch(e){setNotice(e.message)}
  finally{setBusy(false)}
 }
 const connected=!!status.connected;
 return <main className="inf-studio wa-inbox-page">
  <header className="inf-heading"><div><small>BLACKHOLE / COMUNICAÇÃO</small><h1>WhatsApp</h1><p>Caixa de entrada integrada ao CRM. As mensagens recebidas ficam vinculadas ao telefone e ao cadastro correspondente.</p></div>
   <div className="wa-header-actions"><span className={'wa-connection-pill '+(connected?'is-online':'is-offline')}>{connected?<Wifi size={14}/>:<WifiOff size={14}/>} {connected?'Conectado':status.configured?'Desconectado':'Worker não configurado'}</span>
    <button className="inf-btn" type="button" onClick={()=>{load();refreshStatus()}}><RefreshCw size={14}/> Atualizar</button>
    <button className="inf-btn primary" type="button" onClick={connect} disabled={busy||connected||!status.configured}><QrCode size={14}/> {connected?'Conectado':'Conectar por QR'}</button>
   </div>
  </header>
  {lastError&&<p className="inf-note error" role="alert">{lastError}</p>}
  {notice&&<p className="inf-note" role="status">{notice}</p>}
  {!status.configured&&<p className="inf-note">A caixa de entrada já está dentro do CRM. Falta apenas publicar o serviço de conexão QR para ativar o recebimento e o envio pelo WhatsApp.</p>}
  <section className="wa-inbox-layout">
   <aside className="wa-conversations">
    <div className="wa-conversations-head"><strong>Conversas</strong><span>{contacts.length}</span></div>
    <label className="wa-search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente ou telefone"/></label>
    <div className="wa-contact-list">
     {filtered.map(contact=><button key={contact.phone} type="button" className={'wa-contact '+(selectedPhone===contact.phone?'active':'')} onClick={()=>setSelectedPhone(contact.phone)}>
      <span className="wa-contact-avatar">{(contact.client?.name||contact.last?.display_name||'WA').slice(0,1).toUpperCase()}</span>
      <span className="wa-contact-copy"><strong>{contact.client?.name||contact.last?.display_name||prettyPhone(contact.phone)}</strong><small>{contact.last?.body||prettyPhone(contact.phone)}</small></span>
      <span className="wa-contact-time">{contact.last?day(contact.last.received_at):'Novo'}</span>
     </button>)}
     {!filtered.length&&<div className="wa-empty-list"><MessageCircle size={22}/><span>Nenhuma conversa encontrada.</span></div>}
    </div>
   </aside>
   <section className="wa-chat-panel">
    {activeContact?<><div className="wa-chat-head"><div className="wa-chat-person"><span className="wa-contact-avatar">{(client?.name||activeContact.last?.display_name||'WA').slice(0,1).toUpperCase()}</span><div><strong>{client?.name||activeContact.last?.display_name||prettyPhone(selectedPhone)}</strong><small>{prettyPhone(selectedPhone)} · {client?'Cliente cadastrado':'Contato sem cadastro'}</small></div></div>
      <span className="wa-chat-status">{connected?'Canal ativo':'Canal desconectado'}</span></div>
     <div className="wa-message-list">
      {thread.map(msg=><article key={msg.id} className={'wa-message '+(msg.direction==='outbound'?'outbound':'inbound')}>
       <p>{msg.body}</p><footer><time>{time(msg.received_at)}</time>{msg.direction==='outbound'&&<span>{msg.status==='accepted'?'Aceita · entrega não confirmada':msg.status==='sent'?'Enviada pelo provedor':'Registrada'}</span>}</footer>
      </article>)}
      {!thread.length&&<div className="wa-empty-thread"><MessageCircle size={30}/><strong>Inicie uma conversa</strong><span>Este contato está na carteira, mas ainda não há mensagens registradas.</span></div>}
     </div>
     <form className="wa-composer" onSubmit={send}>
      <textarea rows={2} maxLength={1000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={connected?'Escreva uma mensagem...':'Conecte o WhatsApp para enviar mensagens'} disabled={!connected||busy}/>
      <div className="wa-composer-footer"><label><input type="checkbox" checked={confirmSend} onChange={e=>setConfirmSend(e.target.checked)} disabled={!connected}/> Revisei o texto e autorizo este envio</label>
       <button className="inf-btn primary" type="submit" disabled={!connected||busy||!draft.trim()||!confirmSend}><Send size={14}/> {busy?'Enviando...':'Enviar'}</button></div>
     </form>
    </>:<div className="wa-empty-thread"><MessageCircle size={32}/><strong>Selecione uma conversa</strong><span>As conversas e os contatos cadastrados aparecerão nesta área.</span></div>}
   </section>
   <aside className="wa-contact-details">
    <div className="wa-details-avatar"><UserRound size={25}/></div>
    <h2>{client?.name||activeContact?.last?.display_name||'Detalhes do contato'}</h2>
    {activeContact&&<p className="wa-details-phone"><Phone size={13}/>{prettyPhone(activeContact.phone)}</p>}
    {client?<><span className="wa-client-tag">Cliente da carteira</span>
      <dl><div><dt>E-mail</dt><dd>{client.email||'Não cadastrado'}</dd></div><div><dt>Responsável</dt><dd>{client.responsible||'Não informado'}</dd></div><div><dt>Situação</dt><dd>{client.status||'Não informada'}</dd></div></dl>
      <Link className="inf-btn" href={'/clientes?client='+encodeURIComponent(client.id)}><UserRound size={14}/> Abrir cadastro</Link>
      {selectedCase.length>0&&<div className="wa-linked-cases"><strong>Processos vinculados</strong>{selectedCase.map(c=><Link key={c.id} href={'/processos?case='+encodeURIComponent(c.id)}><BriefcaseBusiness size={13}/><span>{c.process_number||c.title}</span></Link>)}</div>}
    </>:<div className="wa-details-empty">Este número ainda não está associado a um cliente. Cadastre-o na carteira para vincular o histórico.</div>}
    <div className="wa-security-note"><ShieldCheck size={14}/><span>Envios exigem confirmação manual. O CRM não responde automaticamente.</span></div>
   </aside>
  </section>
  {qrOpen&&<div className="wa-qr-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setQrOpen(false)}}>
   <section className="wa-qr-modal" role="dialog" aria-modal="true" aria-labelledby="wa-qr-title">
    <button className="wa-qr-close" type="button" onClick={()=>setQrOpen(false)} aria-label="Fechar QR"><X size={18}/></button>
    <div className="wa-qr-icon"><QrCode size={23}/></div><h2 id="wa-qr-title">Conectar WhatsApp</h2>
    <p>Abra o WhatsApp no celular → Aparelhos conectados → Conectar aparelho. Escaneie o QR Code exibido abaixo.</p>
    {(status.connection?.qr||status.qr)?<img className="wa-qr-image" src={status.connection?.qr||status.qr} alt="QR Code real de conexão do WhatsApp"/>:
     <div className="wa-qr-wait"><RefreshCw size={22}/><strong>{status.connection?.status==='connecting'?'Iniciando sessão...':status.connected?'WhatsApp conectado':'Aguardando QR Code'}</strong><span>O código aparecerá aqui quando o serviço responder.</span></div>}
    {(status.error||status.connection?.error)&&<p className="wa-qr-error">{status.error||status.connection?.error}</p>}
    <small>O QR Code é temporário e não deve ser compartilhado. A conexão utiliza um dispositivo vinculado.</small>
   </section>
  </div>}
 </main>;
}
export default function OfficeWhatsApp(){return <SecuredWorkspace active="WhatsApp">{({db,session})=><Inbox db={db} session={session}/>}</SecuredWorkspace>}
