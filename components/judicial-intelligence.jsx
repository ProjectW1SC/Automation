'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,FileSearch,RefreshCw,ExternalLink,ShieldCheck} from 'lucide-react';
import CrmShell from './crm-shell';
import {getClient} from '../lib/supabase-client';
import {useCrmAccess} from '../lib/use-crm-access';
import {hearingCandidates,verdictCandidates} from '../lib/judicial-triage.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
export default function JudicialIntelligence({mode='audiencias'}){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[loadingAuth,setLoadingAuth]=useState(true);
 const access=useCrmAccess(db,session?.user);
 const [snapshots,setSnapshots]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!db){setLoadingAuth(false);return}
  let alive=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(alive){setSession(s);setLoadingAuth(false)}});
  db.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setLoadingAuth(false)}}).catch(()=>setLoadingAuth(false));
  return()=>{alive=false;subscription.unsubscribe()};
 },[db]);
 async function load(){
  if(!db||!access.allowed)return;
  setLoading(true);setError('');
  const {data,error:failure}=await db.from('crm_judicial_snapshots').select('process_number,source,checked_at,payload')
   .order('checked_at',{ascending:false}).limit(500);
  if(failure){setError('Não foi possível carregar as consultas registradas: '+failure.message);setSnapshots([])}
  else setSnapshots(data||[]);
  setLoading(false);
 }
 useEffect(()=>{if(access.allowed)load()},[access.allowed,session?.user?.id]);
 const isHearing=mode==='audiencias';
 const rows=useMemo(()=>isHearing?hearingCandidates(snapshots,todayBrazil()):verdictCandidates(snapshots),[snapshots,isHearing]);
 if(!db)return <main className="reference-auth">Supabase não configurado.</main>;
 if(loadingAuth||access.loading)return <main className="reference-auth">Verificando acesso...</main>;
 if(!session)return <main className="reference-auth"><p>Entre na sua conta para acessar as informações judiciais.</p><a href="/">Ir para o login</a></main>;
 if(!access.allowed)return <main className="reference-auth">Esta conta não tem permissão para consultar a carteira.</main>;
 return <CrmShell active={isHearing?'Audiências':'Veredito'} email={session.user.email} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard processes-dashboard">
   <header className="reference-header"><div><div className="reference-overline">PROJECTW1SC · TRIAGEM DOCUMENTAL</div>
    <h1>{isHearing?'Audiências':'Veredito'}</h1>
    <p>{isHearing?'Possíveis audiências futuras localizadas no teor das consultas oficiais já realizadas.':
     'Indícios de sentença ou julgamento identificados nas consultas oficiais. Conferir sempre o inteiro teor.'}</p></div>
    <div className="reference-actions"><a className="reference-outline" href="/processos"><FileSearch size={16}/> Consultar processos</a>
    <button type="button" className="reference-outline" onClick={load} disabled={loading}><RefreshCw size={16}/> Atualizar registros</button></div>
   </header>
   <section className="reference-panel">
    <div className="reference-panel-title"><ShieldCheck size={20}/><div>
     <h2>{rows.length} {isHearing?'possíveis audiências futuras':'registros para análise'}</h2>
     <p>Dados privados · RLS habilitado · sem consultas em massa no navegador · fontes: DataJud/DJEN</p></div></div>
    {error&&<p role="alert" className="reference-notice">{error}</p>}
    {loading?<p>Carregando registros...</p>:!rows.length?
     <div className="task-empty"><CalendarDays size={30}/><strong>Nenhum registro identificado</strong>
      <p>Consulte os processos em /processos para atualizar as fontes oficiais. Resultado vazio não significa ausência de audiências ou decisões.</p></div>:
     <div className="processes-history">
      {rows.map((item,i)=><article key={item.process_number+'-'+(item.date||'')+'-'+i} className="reference-panel" style={{marginBottom:12,padding:16}}>
       <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div><strong>{isHearing?item.type:item.label}</strong>
         <p><a href={'/processos?numero='+encodeURIComponent(item.process_number)}>{item.process_number}</a></p>
         <p>{isHearing?item.date.split('-').reverse().join('/')+(item.time?' às '+item.time:' · horário não informado'):
          item.date?new Date(item.date).toLocaleDateString('pt-BR'):'Data da decisão não identificada'}</p>
        </div>
        <div><small>Fonte: {item.source} · consulta: {item.checked_at?new Date(item.checked_at).toLocaleString('pt-BR'):'não informada'}</small>
         {item.link&&<p><a href={item.link} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Abrir fonte oficial</a></p>}</div>
       </div>
       <p>{isHearing?item.status:'Triagem automática — não equivale à confirmação do resultado pelo tribunal.'}</p>
       <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{item.evidence||item.title}</p>
      </article>)}
     </div>}
   </section>
  </main>
 </CrmShell>;
}
