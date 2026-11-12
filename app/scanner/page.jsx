'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Radar,RefreshCw,ScanSearch,ShieldCheck,PauseCircle,CalendarDays,Scale,AlertTriangle,CheckCircle2,BookOpen} from 'lucide-react';
import SecuredWorkspace from '../../components/secured-workspace';
import {formatProcessNumber} from '../../lib/processos-oficiais.mjs';
import {withAuthDeadline} from '../../lib/auth-deadline.mjs';
const label={confirmed:'Consulta confirmada',blocked_403:'Bloqueada (403)',rate_limited_429:'Limite atingido (429)',
 cooldown:'Em pausa',timeout:'Tempo esgotado',unavailable:'Indisponível'};
function fmtDate(value){try{return new Date(value).toLocaleString('pt-BR')}catch{return String(value||'—')}}
function Scanner({db,session}){
 const [cases,setCases]=useState([]),[history,setHistory]=useState([]),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[progress,setProgress]=useState({done:0,total:0}),[live,setLive]=useState([]);
 const [auto,setAuto]=useState(false),[scanBatch,setScanBatch]=useState('4');
 const active=useRef(false),aborter=useRef(null),autoRef=useRef(false),casesRef=useRef([]);
 const read=useCallback(async()=>{
  setLoading(true);
  try{
   const results=await withAuthDeadline(Promise.all([
    db.from('office_cases').select('id,process_number,title,tribunal,status').order('updated_at',{ascending:false}).limit(500),
    db.from('crm_processes').select('id,process_number').limit(500),
    db.from('office_scan_runs').select('id,process_number,source_status,review,checked_at,trigger_mode').order('checked_at',{ascending:false}).limit(180)
   ]),12000);
   const failures=results.filter(x=>x.error).map(x=>x.error.message);
   if(failures.length)throw Error(failures.join(' · '));
   const merged=new Map();
   for(const r of [...(results[0].data||[]),...(results[1].data||[])]){
    try{const cnj=formatProcessNumber(r.process_number);
      if(!merged.has(cnj))merged.set(cnj,{...r,process_number:cnj,title:r.title||'Processo registrado'})}catch{}
   }
   const rows=[...merged.values()];
   setCases(rows);casesRef.current=rows;
   setHistory(results[2].data||[]);
   setError('');
  }catch(e){setError('A carteira não pôde ser carregada: '+e.message)}
  finally{setLoading(false)}
 },[db]);
 useEffect(()=>{read()},[read]);
 useEffect(()=>{
  try{const v=window.localStorage.getItem('blackhole.scanner.auto.foreground');setAuto(v==='1')}catch{}
 },[]);
 function updateAuto(v){setAuto(v);try{window.localStorage.setItem('blackhole.scanner.auto.foreground',v?'1':'0')}catch{}}
 const filtered=useMemo(()=>cases.filter(x=>[x.process_number,x.title,x.tribunal].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))),[cases,query]);
 const run=useCallback(async(list,mode='manual')=>{
  if(active.current||!list.length)return;
  active.current=true;setBusy(true);setError('');setNotice('');
  setProgress({done:0,total:list.length});setLive([]);
  const controller=new AbortController();aborter.current=controller;
  try{
   const {data:{session:s},error:se}=await withAuthDeadline(db.auth.getSession(),9500);
   if(se||!s?.access_token)throw Error('Sessão expirada. Faça login novamente.');
   let index=0,success=0,failed=0;
   for(const row of list){
    if(controller.signal.aborted)break;
    try{
     const response=await fetch('/api/scanner',{method:'POST',headers:{Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({process_number:row.process_number,mode}),signal:controller.signal});
     const answer=await response.json();
     if(!response.ok||!answer.ok)throw Error(answer.error||'Consulta não concluída.');
     const outcome={number:row.process_number,title:row.title||'Processo',...answer};
     setLive(items=>[outcome,...items].slice(0,35));
     if(answer.sourceStatus.confirmedSources>0)success++;else failed++;
    }catch(e){
     if(controller.signal.aborted)break;
     failed++;
     setLive(items=>[{number:row.process_number,title:row.title||'Processo',ok:false,error:e.message},...items].slice(0,35));
    }
    index++;setProgress({done:index,total:list.length});
    // Evita varreduras agressivas em IP compartilhado e preserva as fontes oficiais.
    if(index<list.length&&!controller.signal.aborted)await new Promise(resolve=>setTimeout(resolve,1100));
   }
   setNotice('Scanner: '+index+' processo(s) examinados; '+success+' com pelo menos uma fonte confirmada; '+failed+' sem fonte confirmada. Eventos requerem revisão humana.');
   await read();
  }catch(e){setError(e.message)}finally{active.current=false;setBusy(false);aborter.current=null}
 },[db,read]);
 const runNext=()=>run(filtered.slice(0,Number(scanBatch)),'manual');
 const runAll=()=>run(filtered,'manual');
 useEffect(()=>{
  if(!auto||!cases.length)return;
  // Scanner automático em PRIMEIRO PLANO; não promete execução em servidor após a aba fechar.
  let alive=true;
  const tick=()=>{
   if(!alive||document.visibilityState!=='visible'||active.current||!navigator.onLine)return;
   const last=new Set(history.filter(x=>{
    const age=Date.now()-Date.parse(x.checked_at);
    return age>=0&&age<30*60*1000;
   }).map(x=>x.process_number));
   const next=casesRef.current.filter(x=>!last.has(x.process_number)).slice(0,2);
   if(next.length)run(next,'foreground');
  };
  const id=window.setInterval(tick,15*60*1000);
  return()=>{alive=false;window.clearInterval(id)};
 },[auto,cases.length,history,run]);
 useEffect(()=>()=>aborter.current?.abort(),[]);
 const perNumber=new Set(history.map(x=>x.process_number));
 return <main className="inf-studio blackhole-scanner">
  <header className="inf-heading"><div><small>BLACKHOLE / HERMES · MONITORAMENTO OFICIAL</small>
   <h1><Radar size={26}/> Scanner DataJud + DJEN</h1>
   <p>Consulta os CNJs do escritório nas duas fontes oficiais, registra erros separadamente e identifica apenas indícios documentados.</p></div>
   <div className="inf-actions"><Link className="inf-btn" href="/processos">Processos</Link>
    <Link className="inf-btn" href="/gerador-processos">Gerar processos</Link>
    <button type="button" className="inf-btn" onClick={read} disabled={busy||loading}><RefreshCw size={14}/> Atualizar carteira</button></div>
  </header>
  <div className="inf-grid">
   <div className="inf-stat"><label>CNJs disponíveis</label><strong>{cases.length}</strong></div>
   <div className="inf-stat"><label>Processos com histórico de varredura</label><strong>{perNumber.size}</strong></div>
   <div className="inf-stat"><label>Verificados na sessão</label><strong>{progress.done}</strong></div>
   <div className="inf-stat"><label>Restantes nesta execução</label><strong>{Math.max(0,progress.total-progress.done)}</strong></div>
  </div>
  <section className="inf-panel"><h2><ScanSearch size={17}/> Varredura de carteira</h2>
   <p>Os resultados oficiais ficam no Supabase com RLS. Consultas recentes são reutilizadas, e respostas 403/429 entram em pausa. Uma fonte nunca substitui a confirmação da outra.</p>
   <div className="office-action-row blackhole-scanner-controls">
    <input className="inf-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtrar CNJ, tribunal ou caso" aria-label="Filtrar processos"/>
    <select aria-label="Tamanho do lote" value={scanBatch} onChange={e=>setScanBatch(e.target.value)}>
     <option value="2">2 processos</option><option value="4">4 processos</option><option value="8">8 processos</option>
    </select>
    <button type="button" className="inf-btn primary" disabled={busy||!filtered.length||loading} onClick={runNext}><ScanSearch size={14}/> Verificar lote</button>
    <button type="button" className="inf-btn" disabled={busy||!filtered.length||loading} onClick={runAll}>Varrer toda a carteira carregada</button>
    {busy&&<button type="button" className="inf-btn" onClick={()=>aborter.current?.abort()}><PauseCircle size={14}/> Interromper</button>}
   </div>
   <label className="blackhole-scanner-opt"><input type="checkbox" checked={auto} onChange={e=>updateAuto(e.target.checked)}/>
    <span>Verificar automaticamente até 2 processos pendentes a cada 15 minutos <strong>enquanto esta aba estiver aberta</strong></span>
   </label>
   {busy&&<div className="blackhole-scanner-progress"><div style={{width:progress.total?(progress.done/progress.total*100)+'%':'0%'}}/>
    <p>{progress.done} de {progress.total} · consultas em andamento</p></div>}
   {loading&&<p role="status">Carregando carteira autorizada...</p>}
   {error&&<p role="alert" className="inf-note error">{error}</p>}
   {notice&&<p role="status" className="inf-note">{notice}</p>}
  </section>
  {!!live.length&&<section className="inf-panel"><h2>Resultado da execução atual</h2>
   <div className="office-records">{live.map((r,i)=><article key={r.number+'-'+i} className="office-record">
    <strong>{r.title} · {r.number}</strong>
    {r.ok?<><p><CheckCircle2 size={14}/> DataJud: {label[r.sourceStatus?.datajud?.status]||'—'} · DJEN: {label[r.sourceStatus?.djen?.status]||'—'}</p>
     <p>{r.review?.hearings?.length||0} possíveis audiências futuras · {r.review?.verdicts?.length||0} atos de julgamento para revisar · {r.review?.confirmedOfficialEvents||0} movimentos/publicações recebidos</p>
     <small>Retorno sugerido: revisar em {r.review?.nextReturnDays||30} dia(s) — não é prazo judicial.</small>
     {!r.persisted&&<p className="inf-note error">{r.saveError||'Não foi possível registrar o histórico.'}</p>}
     </>:<p className="inf-note error">{r.error||'Fontes indisponíveis'}</p>}
   </article>)}</div></section>}
  <section className="inf-panel"><div className="inf-toolbar"><h2><BookOpen size={17}/> Histórico de consultas rastreáveis</h2>
   <button className="inf-btn" onClick={read} disabled={busy}>Atualizar registros</button></div>
   {!history.length?<div className="inf-empty">Não há varreduras registradas. Escolha Verificar lote para consultar os primeiros CNJs.</div>:
   <div className="office-records">{history.slice(0,70).map(r=><article key={r.id} className="office-record">
    <div className="office-action-row"><strong>{r.process_number}</strong><small>{fmtDate(r.checked_at)} · {r.trigger_mode==='foreground'?'Enquanto aba aberta':'Manual'}</small></div>
    <p>DataJud: {label[r.source_status?.datajud?.status]||'—'} · DJEN: {label[r.source_status?.djen?.status]||'—'}</p>
    <div className="office-action-row">
     {(r.review?.hearings||[]).slice(0,2).map((h,i)=><span className="inf-badge" key={'h'+i}><CalendarDays size={12}/> {h.date} {h.time||''} · a confirmar</span>)}
     {(r.review?.verdicts||[]).slice(0,2).map((v,i)=><span className="inf-badge" key={'v'+i}><Scale size={12}/> {v.label||'Decisão possível'}</span>)}
     {!!r.review?.enforcement?.length&&<span className="inf-badge">Possível cumprimento/execução</span>}
     {!!r.review?.fees?.length&&<span className="inf-badge">Honorários mencionados</span>}
    </div>
    <small>{r.review?.returnReason||'Nenhuma recomendação registrada.'}</small>
   </article>)}</div>}
  </section>
  <p className="inf-note"><ShieldCheck size={14}/> O scanner reutiliza fontes públicas CNJ, não acessa autos protegidos por certificado e não executa peticionamento, contato ou alteração de prazos automaticamente.</p>
 </main>
}
export default function ScannerPage(){return <SecuredWorkspace active="Scanner judicial">{({db,session})=><Scanner db={db} session={session}/>}</SecuredWorkspace>}
