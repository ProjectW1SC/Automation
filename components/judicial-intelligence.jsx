'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {CalendarDays,FileSearch,RefreshCw,ExternalLink,ShieldCheck} from 'lucide-react';
import SecuredWorkspace from './secured-workspace';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
import {hearingCandidates,verdictCandidates} from '../lib/judicial-triage.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
function JudicialView({mode,db}){
 const [snapshots,setSnapshots]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const {data,error:failure}=await withAuthDeadline(db.from('crm_judicial_snapshots')
    .select('process_number,source,checked_at,payload').order('checked_at',{ascending:false}).limit(500),12000);
   if(failure)throw failure;
   setSnapshots(data||[]);
  }catch(e){setError('Não foi possível carregar consultas: '+e.message);setSnapshots([])}
  finally{setLoading(false)}
 },[db]);
 useEffect(()=>{load()},[load]);
 const isHearing=mode==='audiencias';
 const rows=useMemo(()=>isHearing?hearingCandidates(snapshots,todayBrazil()):verdictCandidates(snapshots),[snapshots,isHearing]);
 return <main className="reference-dashboard processes-dashboard">
   <header className="reference-header"><div><div className="reference-overline">BLACKHOLE / HERMES · TRIAGEM DOCUMENTAL</div>
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
  </main>;
}
export default function JudicialIntelligence({mode='audiencias'}){
 return <SecuredWorkspace active={mode==='audiencias'?'Audiências':'Veredito'}>{({db})=><JudicialView db={db} mode={mode}/>}</SecuredWorkspace>;
}
