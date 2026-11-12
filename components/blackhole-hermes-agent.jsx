'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Bot,ScanSearch,RefreshCw,CalendarDays,AlertTriangle,CheckCircle2,ClipboardList} from 'lucide-react';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';
const names={confirmed:'Confirmada',blocked_403:'Bloqueada · 403',rate_limited_429:'Limite · 429',
 cooldown:'Em pausa',timeout:'Tempo esgotado',unavailable:'Não confirmada'};
const source=x=>names[x?.status]||'Sem dados';
const addDays=(days)=>{
 const dt=new Date();dt.setUTCDate(dt.getUTCDate()+Math.max(1,Math.min(45,Math.floor(Number(days)||15))));
 return dt.toISOString().slice(0,10);
};
export default function BlackholeHermesAgent({db,session}){
 const [runs,setRuns]=useState([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  try{
   const {data,error}=await withAuthDeadline(db.from('office_scan_runs')
    .select('id,process_number,source_status,review,checked_at').order('checked_at',{ascending:false}).limit(55),12000);
   if(error)throw error;
   const seen=new Set();
   setRuns((data||[]).filter(row=>{if(seen.has(row.process_number))return false;seen.add(row.process_number);return true}).slice(0,25));
   setError('');
  }catch(e){setError('Histórico Hermes indisponível: '+e.message)}
 },[db]);
 useEffect(()=>{load()},[load]);
 async function createTask(row){
  const title='Revisar fontes judiciais · '+row.process_number;
  setBusy(row.id);setNotice('');setError('');
  try{
   const lookup=await db.from('office_workflow_cards').select('id').eq('title',title).neq('stage','concluido').limit(1);
   if(lookup.error)throw lookup.error;
   if(lookup.data?.length){setNotice('Essa revisão já consta no Kanban.');return}
   const desc=[
    'Origem: scanner BLACKHOLE/Hermes · '+String(row.checked_at||''),
    'DataJud: '+source(row.source_status?.datajud),
    'DJEN: '+source(row.source_status?.djen),
    'Orientação: '+String(row.review?.returnReason||'Conferir registros oficiais.').slice(0,380),
    'Retorno operacional sugerido em '+String(row.review?.nextReturnDays||15)+' dias.',
    'ATENÇÃO: não é prazo judicial nem confirmação de ato em fonte bloqueada.'
   ].join('\n');
   const due_on=addDays(row.review?.nextReturnDays||15);
   const created=await db.from('office_workflow_cards').insert({owner_id:session.user.id,
    title,description:desc,stage:'triagem',card_type:'tarefa',priority:row.review?.hearings?.length?'alta':'normal',
    due_on,source:'manual'}).select('id').single();
   if(created.error||!created.data?.id)throw Error(created.error?.message||'Não foi possível registrar a tarefa.');
   const audit=await db.from('office_agent_runs').insert({owner_id:session.user.id,
    agent:'hermes',task:'Criar tarefa operacional de revisão para '+row.process_number,
    mode:'manual',status:'review',result:{taskId:created.data.id,processNumber:row.process_number,
    recommendation:row.review?.returnReason||'',due_on},external_actions:0,
    sources:[{source:'DJEN',status:source(row.source_status?.djen)},{source:'DataJud',status:source(row.source_status?.datajud)}]});
   setNotice('Tarefa de revisão criada para '+due_on+'. '+(audit.error?'O log do agente não foi salvo.':'Ação interna registrada. Nenhuma mensagem foi enviada.'));
  }catch(e){setError('Não foi possível criar tarefa: '+e.message)}
  finally{setBusy('')}
 }
 return <section className="inf-panel blackhole-hermes-agent">
  <div className="inf-toolbar"><div><h2><Bot size={16}/> Hermes · inteligência baseada nas consultas</h2>
   <p>Reúne os últimos resultados DataJud e DJEN, identifica pendências e permite criar revisões no Kanban sem simular providências judiciais.</p></div>
   <Link href="/scanner" className="inf-btn primary"><ScanSearch size={14}/> Abrir scanner</Link>
   <button className="inf-btn" onClick={load} disabled={!!busy}><RefreshCw size={14}/> Atualizar</button>
  </div>
  {error&&<p role="alert" className="inf-note error">{error}</p>}
  {notice&&<p role="status" className="inf-note">{notice}</p>}
  {!runs.length?<div className="inf-note">Nenhuma varredura concluída nesta carteira. Abra o Scanner para consultar os CNJs reais.</div>:
   <div className="office-records">{runs.map(r=><article key={r.id} className="office-record">
    <div className="inf-toolbar"><strong>{r.process_number}</strong><small>{new Date(r.checked_at).toLocaleString('pt-BR')}</small></div>
    <p>DataJud: {source(r.source_status?.datajud)} · DJEN: {source(r.source_status?.djen)}</p>
    <p>{r.review?.returnReason||'Conferir as fontes oficiais antes da próxima decisão.'}</p>
    <div className="office-action-row">
     {!!r.review?.hearings?.length&&<span className="inf-badge"><CalendarDays size={13}/> {r.review.hearings.length} possível(is) audiência(s)</span>}
     {!!r.review?.verdicts?.length&&<span className="inf-badge">Possível decisão: {r.review.verdicts.length}</span>}
     {(!r.source_status?.complete)&&<span className="inf-badge"><AlertTriangle size={13}/> Fontes incompletas</span>}
    </div>
    <div className="office-action-row">
     <button type="button" className="inf-btn" onClick={()=>createTask(r)} disabled={!!busy}><ClipboardList size={13}/>
      {busy===r.id?'Registrando...':'Criar tarefa de revisão'}</button>
     <Link className="inf-btn" href="/fluxos">Abrir Kanban</Link>
    </div>
   </article>)}</div>}
  <p className="office-hint"><CheckCircle2 size={13}/> Recomendações operacionais somente. Revisão do advogado é obrigatória para determinar prazo, audiência, recurso ou peticionamento.</p>
 </section>;
}
