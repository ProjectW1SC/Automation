'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Bot,CalendarDays,MessageSquare,ExternalLink,Scale,FileSearch,Cloud,ShieldCheck} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import {createIcsEvent} from '../lib/blackhole-free-integrations.mjs';
const OPTIONS=[
 {title:'Superagente',icon:Bot,desc:'Motor de evidências, Qwen 0.5B local sob demanda e IA gratuita opcional.',route:'/superagente',type:'ai'},
 {title:'WhatsApp Web',icon:MessageSquare,desc:'Abrir conversas gratuitamente no navegador. O envio é confirmado pelo usuário.',route:'/whatsapp',type:'web'},
 {title:'Leads',icon:Cloud,desc:'Cadastro, qualificação e importação de leads para seu escritório.',route:'/leads',type:'local'},
 {title:'Scanner judicial',icon:FileSearch,desc:'DataJud e DJEN públicos, sujeitas aos bloqueios reais dos tribunais.',route:'/scanner',type:'local'},
 {title:'Peças e petições',icon:Scale,desc:'Minutas estruturadas e IA online autorizada para aprimorar rascunhos.',route:'/pecas',type:'ai'},
 {title:'Audiências e agenda',icon:CalendarDays,desc:'Controle interno e exportação gratuita por arquivo de calendário.',route:'/audiencias',type:'local'}
];
const getItems=p=>Array.isArray(p?.items)?p.items:[];
function Body({db}){
 const [ai,setAi]=useState({configured:false}),[wa,setWa]=useState({configured:false});
 const [courts,setCourts]=useState([]),[more,setMore]=useState(false),[notice,setNotice]=useState('');
 const [event,setEvent]=useState({title:'',date:'',description:''});
 const load=useCallback(async()=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)return;
  const init={headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'};
  const requests=await Promise.allSettled([
   fetch('/api/office/ai/status',init).then(x=>x.json()),
   fetch('/api/office/whatsapp/status',init).then(x=>x.json()),
   fetch('/api/office/courts',init).then(x=>x.json())
  ]);
  if(requests[0].status==='fulfilled'&&requests[0].value?.ok)setAi(requests[0].value);
  if(requests[1].status==='fulfilled'&&requests[1].value?.ok)setWa(requests[1].value);
  if(requests[2].status==='fulfilled'&&requests[2].value?.ok)setCourts(getItems(requests[2].value));
 },[db]);
 useEffect(()=>{load().catch(()=>{})},[load]);
 const status=k=>k==='ai'?(ai.configured?'Chave de IA cadastrada':'Motor local disponível'):k==='web'?'Uso manual gratuito':'Disponível sem API paga';
 function createEvent(e){
  e.preventDefault();
  try{
   const content=createIcsEvent({...event,uid:'blackhole-'+Date.now()});
   const obj=new Blob([content],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(obj);
   const a=document.createElement('a');a.href=url;a.download='blackhole-agenda.ics';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),1200);
   setNotice('Compromisso exportado. A inclusão no calendário é manual e não confirma pauta judicial.');
  }catch(err){setNotice(err.message)}
 }
 return <main className="inf-studio blackhole-native-integrations">
  <header className="inf-heading"><div><small>BLACKHOLE / CENTRAL DE RECURSOS</small><h1>Integrações gratuitas</h1>
   <p>Ferramentas operacionais do escritório. Só indicamos uma integração como conectada quando há evidência real de conexão.</p></div>
   <button type="button" className="inf-btn" onClick={load}>Atualizar status</button>
  </header>
  <div className="blackhole-native-integrations-grid">
   {OPTIONS.map(item=>{const Icon=item.icon;return <Link key={item.title} href={item.route} className="blackhole-native-integration">
    <span className="blackhole-native-icon"><Icon size={20}/></span><strong>{item.title}</strong><p>{item.desc}</p>
    <small>{status(item.type)}</small>
   </Link>})}
  </div>
  <section className="inf-panel"><h2><ShieldCheck size={16}/> WhatsApp sem API oficial</h2>
   <p>Use gratuitamente o <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer">WhatsApp Web</a> pelo próprio aparelho conectado. O BLACKHOLE pode abrir uma conversa com texto preenchido, mas não pode ler sua sessão em outra aba nem confirmar envios sem um worker conectado.</p>
   <div className="office-action-row"><Link href="/whatsapp" className="inf-btn primary">Abrir atendimento e conversa</Link>
    <a href="https://web.whatsapp.com/" className="inf-btn" rel="noopener noreferrer" target="_blank">Abrir WhatsApp Web <ExternalLink size={13}/></a></div>
   <p>WA.Auto do LexisPredict utiliza Baileys; Wechaty e Evolution também exigem uma sessão/serviço persistente. Nenhum deles está vinculado automaticamente ao BLACKHOLE. Conexão por QR não será indicada sem QR verdadeiro.</p>
  </section>
  <section className="inf-panel"><h2><Bot size={16}/> Motores de inteligência artificial</h2>
   <div className="office-panel-grid">
    <article className="office-record"><strong>Respostas rápidas e evidências</strong><p>Regras verificáveis e consulta aos dados autorizados, sem download e sem token.</p><small>Disponível</small></article>
    <article className="office-record"><strong>Qwen 0.5B no navegador</strong><p>WebGPU e download manual dos pesos. Sem fallback CPU para evitar travar computadores fracos.</p><small>Opcional · executar no Superagente</small></article>
    <article className="office-record"><strong>OpenRouter gratuito</strong><p>{ai.configured?'Chave privada cadastrada no servidor. É necessário autorizar cada envio.':'Sem chave válida detectada nesta sessão.'}</p><small>{ai.configured?'Configurado (geração não testada)':'Não conectado'}</small></article>
   </div>
  </section>
  <section className="inf-panel"><h2>Agenda local gratuita (.ics)</h2>
   <p>Exporte para Google Calendar, Outlook ou outro calendário sem API paga. Confira a data em publicação oficial antes de usar em prazo judicial.</p>
   <form className="office-form-col" onSubmit={createEvent}><div className="inf-fields">
     <label>Título<input required minLength={2} value={event.title} onChange={e=>setEvent({...event,title:e.target.value})}/></label>
     <label>Data<input type="date" required value={event.date} onChange={e=>setEvent({...event,date:e.target.value})}/></label>
     <label>Observações<input maxLength={300} value={event.description} onChange={e=>setEvent({...event,description:e.target.value})}/></label>
    </div><div className="inf-row-end"><button type="submit" className="inf-btn primary">Exportar compromisso</button></div></form>
  </section>
  {courts.length>0&&<section className="inf-panel"><h2>Fontes dos tribunais · links oficiais públicos</h2>
   <p>{courts.length} fontes cadastradas para abrir no portal do tribunal. Links não substituem consulta autenticada ou confirmação de audiências.</p>
   <div className="blackhole-native-integrations-grid">
    {courts.slice(0,more?courts.length:9).map(item=><a key={item.id} className="blackhole-native-integration" href={item.url} rel="noopener noreferrer" target="_blank"><strong>{item.label}</strong><small>Consultar site oficial <ExternalLink size={12}/></small></a>)}
   </div>
   {courts.length>9&&<button className="inf-btn" type="button" onClick={()=>setMore(x=>!x)}>{more?'Mostrar menos':'Mostrar todas as fontes'}</button>}
  </section>}
  {notice&&<div className="inf-note" role="status">{notice}</div>}
 </main>;
}
export default function OfficeIntegrations(){return <SecuredWorkspace active="Integrações">{({db})=><Body db={db}/>}</SecuredWorkspace>}
