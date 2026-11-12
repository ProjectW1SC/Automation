'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,RefreshCw,ShieldCheck} from 'lucide-react';
import {hearingCandidates} from '../lib/judicial-triage.mjs';
import {todayBrazil} from '../lib/tarefas.mjs';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
export default function BlackholeOfficialHearings({db}){
 const [snapshots,setSnapshots]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  setBusy(true);
  try{
   const {data,error:failure}=await withAuthDeadline(db.from('crm_judicial_snapshots')
    .select('process_number,source,checked_at,payload').order('checked_at',{ascending:false}).limit(500),12000);
   if(failure)throw failure;
   setSnapshots(data||[]);setError('');
  }catch(e){setError('Histórico oficial indisponível: '+e.message)}
  finally{setBusy(false)}
 },[db]);
 useEffect(()=>{load()},[load]);
 const rows=useMemo(()=>hearingCandidates(snapshots,todayBrazil()).slice(0,60),[snapshots]);
 return <section className="inf-panel">
  <div className="inf-toolbar"><h2><CalendarDays size={16}/> Audiências futuras nas consultas oficiais</h2>
   <button type="button" className="inf-btn" onClick={load} disabled={busy}><RefreshCw size={13}/> Atualizar</button>
   <Link href="/scanner" className="inf-btn primary">Consultar os processos</Link></div>
  <p>A data da audiência é extraída do teor oficial, não da data da publicação. Audiências anteriores à data atual são ignoradas.</p>
  {error&&<p className="inf-note error" role="alert">{error}</p>}
  {!rows.length?<p className="inf-note">{busy?'Consultando os registros...':'Nenhuma audiência futura identificada nos registros já consultados. Isso não prova ausência de audiência no tribunal.'}</p>:
   <div className="office-records">{rows.map((a,i)=><article key={a.process_number+'-'+a.date+'-'+i} className="office-record">
    <strong>{a.type} · {a.date.split('-').reverse().join('/')} · {a.time||'horário a conferir'}</strong>
    <p>CNJ: {a.process_number} · Fonte: {a.source}</p>
    <p>{a.evidence||a.title}</p>
    {a.link&&<a href={a.link} target="_blank" rel="noopener noreferrer">Abrir fonte oficial</a>}
   </article>)}</div>}
  <p className="office-hint"><ShieldCheck size={12}/> São indícios documentados para revisão, não confirmação automática da audiência ou de prazo judicial.</p>
 </section>;
}
