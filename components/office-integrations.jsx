'use client';
import {useEffect,useState,useCallback} from 'react';
import Link from 'next/link';
import {PlugZap,RefreshCw,ExternalLink,ShieldCheck,Workflow,MessageSquare,CalendarDays,ChartNoAxesCombined,Bot,CodeXml,FileCheck2} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
const SERVICES=[
 {name:'WhatsApp',icon:MessageSquare,subtitle:'Cloud API oficial',route:'/whatsapp'},
 {name:'Asaas',icon:ChartNoAxesCombined,subtitle:'Financeiro e cobranças',route:'/configuracoes'},
 {name:'Agenda',icon:CalendarDays,subtitle:'Audiências e compromissos',route:'/audiencias'},
 {name:'Meta',icon:PlugZap,subtitle:'Captação e campanhas',route:'/leads'},
 {name:'IA jurídica',icon:Bot,subtitle:'Provedores configuráveis',route:'/pecas'},
 {name:'API pública',icon:CodeXml,subtitle:'Infinitum REST documentado',route:'#api'}
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
 const query=useCallback(async(resource,params={})=>{
  const {data:{session}}=await db.auth.getSession();
  if(!session?.access_token)throw Error('Sessão expirada.');
  const url='/api/office/infinitum?'+new URLSearchParams({resource,...params}).toString();
  const r=await fetch(url,{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});
  const p=await r.json();if(!p.ok)throw Error(p.error||'Consulta não concluída.');
  return p;
 },[db]);
 useEffect(()=>{let alive=true;async function status(){
  try{const {data:{session}}=await db.auth.getSession();if(!session)return;
   const [r,w]=await Promise.all([
    query('organizations'),
    fetch('/api/office/whatsapp/status',{headers:{Authorization:'Bearer '+session.access_token}}).then(x=>x.json())
   ]);
   if(!alive)return;
   setState({configured:r.configured});setWhatsapp(w);if(r.configured)setOrganizations(asRows(r.data));
  }catch(e){if(alive)setNotice('Integração não confirmada: '+e.message)}
 }status();return()=>{alive=false}},[db,query]);
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
  <header className="inf-heading"><div><small>CONEXÕES · AUTORIZADAS · SOMENTE LEITURA</small><h1>Integrações</h1>
    <p>Central de ferramentas externas. A API pública Infinitum só pode ser consultada com um token válido de sua organização, guardado no servidor.</p></div>
   <Link href="/agentes" className="inf-btn"><Bot size={15}/> Agentes do escritório</Link>
  </header>
  <div className="office-integration-cards">{SERVICES.map(s=>{const Icon=s.icon;const active=s.name==='API pública'?state.configured:s.name==='WhatsApp'?whatsapp.configured:false;
   return <Link href={s.route} key={s.name} className="office-integration-card">
    <div className="office-integration-icon"><Icon size={23}/></div><strong>{s.name}</strong><p>{s.subtitle}</p><small className={active?'configured':'pending'}>{active?'Configurado':'Requer configuração'}</small>
   </Link>
  })}</div>
  <section className="inf-panel" id="api">
   <div className="office-toolbar"><div><h2><CodeXml size={17}/> API pública Infinitum</h2><p>Organizações, procedimentos (POP), fases e cards. Integração REST documentada, não acesso ao backend privado.</p></div>
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
