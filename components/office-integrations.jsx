'use client';
import {useEffect,useState,useCallback} from 'react';
import Link from 'next/link';
import {PlugZap,RefreshCw,ExternalLink,ShieldCheck,Workflow,MessageSquare,CalendarDays,ChartNoAxesCombined,Bot,CodeXml,FileCheck2} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import {createIcsEvent} from '../lib/blackhole-free-integrations.mjs';
const SERVICES=[
 {name:'WhatsApp',icon:MessageSquare,subtitle:'Cloud API oficial',route:'/whatsapp'},
 {name:'Asaas',icon:ChartNoAxesCombined,subtitle:'Financeiro e cobranças',route:'/configuracoes'},
 {name:'Agenda',icon:CalendarDays,subtitle:'Audiências e compromissos',route:'/audiencias'},
 {name:'Meta',icon:PlugZap,subtitle:'Captação e campanhas',route:'/leads'},
 {name:'IA jurídica',icon:Bot,subtitle:'Provedores configuráveis',route:'/pecas'},
 {name:'Fontes dos tribunais',icon:CalendarDays,subtitle:'Pautas e plenários oficiais (28 fontes)',route:'#courts'},
 {name:'Infinitum (opcional)',icon:CodeXml,subtitle:'Conector externo de leitura',route:'#api'}
];
const asRows=obj=>{
 if(Array.isArray(obj))return obj;
 for(const x of [obj?.items,obj?.data,obj?.results,obj?.organizations,obj?.pops,obj?.cards,obj?.phases,obj?.example])if(Array.isArray(x))return x;
 return [];
};
const safeLabel=x=>String(x?.name||x?.title||x?.description||x?.id||'Registro').slice(0,140);
function Body({db}){
 const [state,setState]=useState({configured:false}),[whatsapp,setWhatsapp]=useState({configured:false});
 const [organizations,setOrganizations]=useState([]),[pops,setPops]=useState([]),[phases,setPhases]=useState([]),[cards,setCards]=useState([]);
 const [org,setOrg]=useState(''),[pop,setPop]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [event,setEvent]=useState({title:'',date:'',description:''});
 const [courtSources,setCourtSources]=useState([]),[showAllCourts,setShowAllCourts]=useState(false);
 const query=useCallback(async(resource,params={})=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)throw Error('Sessão expirada.');
  const url='/api/office/infinitum?'+new URLSearchParams({resource,...params}).toString();
  const r=await fetch(url,{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const p=await r.json();if(!p.ok)throw Error(p.error||'Consulta não concluída.');
  return p;
 },[db]);
 useEffect(()=>{let alive=true;
 async function status(){
  const {data:{session}}=await db.auth.getSession();
  if(!alive||!session?.access_token)return;
  // Não deixar Infinitum opcional quebrar a verificação independente de
  // WhatsApp/tribunais: são provedores diferentes.
  const [orgState,w,official]=await Promise.allSettled([
   query('organizations'),
   fetch('/api/office/whatsapp/status',{headers:{Authorization:'Bearer '+session.access_token}}).then(x=>x.json()),
   fetch('/api/office/courts',{headers:{Authorization:'Bearer '+session.access_token}}).then(x=>x.json())
  ]);
  if(!alive)return;
  if(orgState.status==='fulfilled'){
   setState({configured:!!orgState.value.configured});
   if(orgState.value.configured)setOrganizations(asRows(orgState.value.data));
  }else setState({configured:false});
  if(w.status==='fulfilled')setWhatsapp(w.value||{configured:false});
  if(official.status==='fulfilled'&&official.value?.ok)setCourtSources(official.value.items||[]);
 }
 status().catch(e=>{if(alive)setNotice('Falha temporária ao conferir integrações: '+e.message)});
 return()=>{alive=false};
 },[db,query]);
 async function load(resource,params){
  setBusy(true);setNotice('');
  try{
   const r=await query(resource,params);
   if(!r.configured)throw Error('Adicione um token novo da sua organização na Vercel.');
   const rows=asRows(r.data);
   if(resource==='pops')setPops(rows);
   if(resource==='phases')setPhases(rows);
   if(resource==='cards')setCards(rows);
   setNotice(rows.length+' registros retornados pela API pública. Nenhuma informação foi modificada no Infinitum.');
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 return <main className="inf-studio">
  <header className="inf-heading"><div><small>BLACKHOLE · FERRAMENTAS E CONECTORES</small><h1>Integrações</h1>
    <p>Use alternativas gratuitas onde for possível. Serviços opcionais exigem credenciais próprias e nunca são exibidos como conectados sem verificação.</p></div>
   <Link href="/agentes" className="inf-btn"><Bot size={15}/> Agentes do escritório</Link>
  </header>
  <div className="office-integration-cards">{SERVICES.map(s=>{const Icon=s.icon;const active=s.name==='Fontes dos tribunais'?courtSources.length>0:s.name==='Infinitum (opcional)'?state.configured:s.name==='WhatsApp'?whatsapp.configured:false;
   return <Link href={s.route} key={s.name} className="office-integration-card">
    <div className="office-integration-icon"><Icon size={23}/></div><strong>{s.name}</strong><p>{s.subtitle}</p><small className={active?'configured':'pending'}>{active?'Configurado':'Requer configuração'}</small>
   </Link>
  })}</div>
  <section className="inf-panel"><h2>Alternativas gratuitas</h2>
   <p>Estas opções não precisam de uma API paga. Ações externas permanecem manuais; os links abaixo abrem serviços ou documentação públicos.</p>
   <div className="office-integration-cards">
    <a className="office-integration-card" href="https://wa.me/?text=Ol%C3%A1" target="_blank" rel="noopener noreferrer"><strong>WhatsApp sem API</strong><p>Conversas manuais por wa.me ou WhatsApp Web. Sem leitura/automação oculta.</p><small className="configured">Abrir conversa grátis</small></a>
    <a className="office-integration-card" href="https://github.com/wechaty/wechaty" target="_blank" rel="noopener noreferrer"><strong>Wechaty / WA.AUTO</strong><p>Alternativa técnica de automação que exige serviço persistente próprio; ainda não conectada, não adequada a Vercel Functions.</p><small className="pending">Estudar integração gratuita</small></a>
    <a className="office-integration-card" href="https://openrouter.ai/collections/free-models" target="_blank" rel="noopener noreferrer"><strong>OpenRouter — IA gratuita</strong><p>Modelos gratuitos sob limites de requisições. Uma chave de API é necessária para respostas generativas.</p><small className="configured">Ver modelos gratuitos</small></a>
    <a className="office-integration-card" href="/gerador-processos"><strong>Consultas e carteira</strong><p>Cadastro de CNJ mesmo quando DJEN bloqueia. DataJud por número e conferência em portal oficial.</p><small className="configured">Usar sem custo de API</small></a>
    <a className="office-integration-card" href="https://docs.google.com/spreadsheets/" target="_blank" rel="noopener noreferrer"><strong>Financeiro em planilha</strong><p>Alternativa de controle manual a integrações de cobrança pagas. Sem emissão de PIX ou boleto pelo CRM.</p><small className="configured">Abrir planilhas</small></a>
    <a className="office-integration-card" href="https://business.facebook.com/" target="_blank" rel="noopener noreferrer"><strong>Conteúdo orgânico Meta</strong><p>Publicações manuais e ferramentas da sua conta, sem prometer conexão de campanhas.</p><small className="configured">Abrir Meta Business</small></a>
   </div>
   <div className="office-free-calendar">
    <h2>Agenda gratuita · Exportar calendário (.ics)</h2>
    <p>Gera um compromisso de dia inteiro que você pode importar no Google Calendar, Outlook ou outra agenda. Não confirma automaticamente audiência judicial.</p>
    <form onSubmit={e=>{e.preventDefault();try{const content=createIcsEvent({...event,uid:'bh-'+Date.now()});const blob=new Blob([content],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='blackhole-compromisso.ics';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1500);setNotice('Arquivo ICS gerado. Importe na sua agenda.')}catch(err){setNotice(err.message)}}}>
     <div className="inf-fields"><label>Compromisso<input required minLength={2} value={event.title} onChange={e=>setEvent({...event,title:e.target.value})} placeholder="Revisão, audiência a confirmar..."/></label>
       <label>Data<input type="date" required value={event.date} onChange={e=>setEvent({...event,date:e.target.value})}/></label>
       <label>Observações<input value={event.description} maxLength={300} onChange={e=>setEvent({...event,description:e.target.value})}/></label></div>
     <div className="inf-row-end"><button className="inf-btn primary" type="submit">Baixar evento .ics</button></div>
    </form>
   </div>
  </section>
  <section className="inf-panel" id="courts">
   <div className="office-toolbar"><div><h2>Fontes dos tribunais e plenários</h2>
    <p>Endereços oficiais reaproveitados do LexisPredict. São pautas e sessões públicas, não APIs de acesso automático aos autos e nem confirmação de audiências individuais.</p></div>
    <Link href="/scanner" className="inf-btn">Scanner DataJud + DJEN</Link></div>
   {courtSources.length?<><p>{courtSources.length} fontes oficiais configuradas nesta instalação.</p>
    <div className="office-integration-cards">
     {courtSources.slice(0,showAllCourts?courtSources.length:9).map(item=>
      <a key={item.id} className="office-integration-card" href={item.url} target="_blank" rel="noopener noreferrer">
       <strong>{item.label}</strong><p>{item.url.replace(/^https:\/\//,'').slice(0,100)}</p>
       <small className="configured">Abrir site oficial</small>
      </a>)}
    </div>
    {courtSources.length>9&&<button className="inf-btn" type="button" onClick={()=>setShowAllCourts(x=>!x)}>
     {showAllCourts?'Exibir menos':'Mostrar todas as '+courtSources.length+' fontes'}</button>}
    </>:<div className="inf-note">Nenhuma fonte de pautas cadastrada. O scanner DataJud/DJEN continua independente desses links.</div>}
  </section>
  <section className="inf-panel" id="api">
   <div className="office-toolbar"><div><h2><CodeXml size={17}/> Conector opcional Infinitum</h2><p>Organizações, procedimentos (POP), fases e cards. Integração REST documentada, não acesso ao backend privado.</p></div>
    <a href="https://public.infinitum.app.br/swagger/index.html" rel="noopener noreferrer" target="_blank" className="inf-btn">Documentação pública <ExternalLink size={13}/></a>
   </div>
   {!state.configured?<div className="inf-note"><ShieldCheck size={14}/> Ainda não conectado. Gere ou renove um Public Token na conta da organização autorizada e cadastre-o como <code>INFINITUM_PUBLIC_TOKEN</code> nas variáveis privadas da Vercel. Nunca inclua token no URL nem no navegador.</div>:<>
    <div className="inf-fields">
     <label>Organização<select value={org} onChange={e=>{setOrg(e.target.value);setPop('');setPops([]);setPhases([]);setCards([])}}>
      <option value="">Selecione</option>{organizations.map((x,i)=><option key={x.id||i} value={x.id}>{safeLabel(x)}</option>)}</select></label>
     <div className="office-form-col"><label>Procedimentos</label><button className="inf-btn" disabled={!org||busy} onClick={()=>load('pops',{organization_id:org})}><RefreshCw size={14}/> Consultar POPs</button></div>
     <label>POP<select value={pop} onChange={e=>{setPop(e.target.value);setPhases([]);setCards([])}}>
      <option value="">Selecione</option>{pops.map((x,i)=><option key={x.id||i} value={x.id}>{safeLabel(x)}</option>)}</select></label>
    </div>
    <div className="office-action-row">
     <button className="inf-btn" type="button" disabled={!pop||busy} onClick={()=>load('phases',{pop_id:pop})}><Workflow size={14}/> Visualizar fases</button>
     <button className="inf-btn" type="button" disabled={!org||busy} onClick={()=>load('cards',{organization_id:org,pop_id:pop||undefined,limit:'30'})}><FileCheck2 size={14}/> Listar cards autorizados</button>
     <Link href="/fluxos" className="inf-btn primary">Abrir Kanban próprio</Link>
    </div>
    <div className="office-panel-grid" style={{marginTop:16}}>
     <div className="office-records">{phases.map((x,i)=><article key={x.id||i} className="office-record"><strong>{safeLabel(x)}</strong><small>Fase {Number(x.order)||i+1}</small></article>)}</div>
     <div className="office-records">{cards.map((x,i)=><article key={x.id||i} className="office-record"><strong>{safeLabel(x)}</strong><small>ID do card: {String(x.id||'').slice(0,50)}</small></article>)}</div>
    </div>
   </>}
   {notice&&<p className="inf-note" role="status">{notice}</p>}
  </section>
  <section className="inf-panel"><h2>Limites de integração</h2><p>Este conector não copia informações confidenciais para o escritório, não altera permissões de outra plataforma e não utiliza o endereço com token enviado na conversa. As integrações Asaas/Agenda/Meta não são apresentadas como operacionais enquanto não configuradas.</p></section>
 </main>;
}
export default function OfficeIntegrations(){return <SecuredWorkspace active="Integrações">{({db})=><Body db={db}/>}</SecuredWorkspace>}
