'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {CalendarDays,ExternalLink,FileSearch,Gavel,History,RefreshCw,Search,ShieldCheck,BookOpen} from 'lucide-react';
import {normalizeCaseNumber,normalizeLexisJudicialTimeline} from '../lib/lexis-operator-data.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
import {browseOfficialDjenNumber} from '../lib/blackhole-public-djen-browser.mjs';
const fmt=x=>x?String(x).slice(0,10).split('-').reverse().join('/'):'Sem data confirmada';
const states={ok:'Confirmada nesta consulta',ok_browser:'Confirmada pelo navegador',cached_previous:'Histórico anterior',blocked_403:'Bloqueada (403)',rate_limited_429:'Limite de consultas (429)',timeout:'Tempo esgotado',unavailable:'Indisponível',not_checked:'Não consultada'};
const src=x=>x==='DataJud'?'DataJud':'DJEN';
export default function LexisJudicialDossier({db,session}){
 const [number,setNumber]=useState(''),[draft,setDraft]=useState(''),[profile,setProfile]=useState(null),[record,setRecord]=useState(null);
 const [snapshots,setSnapshots]=useState([]),[live,setLive]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(false),[consulting,setConsulting]=useState(false),[range,setRange]=useState({start:'',end:''});
 const [source,setSource]=useState('auto'),[force,setForce]=useState(false),[progress,setProgress]=useState('');
 useEffect(()=>{let active=true;(async()=>{
  const res=await db.from('usuarios').select('auth_user_id,empresa_id,nome').eq('auth_user_id',session.user.id).limit(2);
  if(!active)return;
  if(res.error||res.data?.length!==1||!res.data[0].empresa_id){setError('Conta sem vínculo único com a empresa LexisPredict.');return}
  setProfile(res.data[0]);
  const url=new URLSearchParams(window.location.search).get('numero')||new URLSearchParams(window.location.search).get('buscar');
  if(url){setDraft(url);const valid=normalizeCaseNumber(url);if(valid)setNumber(valid);else setError('CNJ na URL não possui 20 dígitos.')}
 })();return()=>{active=false}},[db,session.user.id]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id||!number)return;
  setLoading(true);setError('');setNotice('');setLive(null);
  try{
   const [proc,saved]=await Promise.all([
    db.from('processos').select('id,empresa_id,cliente,protocolo_ref,tribunal,classe_acao,status_interno,status,ultima_movimentacao,datajud_ultimo_nome,datajud_ultimo_movimento,datajud_consultado_em,djen_ultima_data,djen_ultimo_resumo,djen_ultimo_link,djen_consultado_em,djen_count,updated_at')
     .eq('empresa_id',profile.empresa_id).eq('protocolo_ref',number).limit(2),
    db.from('crm_judicial_snapshots').select('id,source,checked_at,payload,empresa_id')
     .eq('empresa_id',profile.empresa_id).eq('process_number',number).order('checked_at',{ascending:false}).limit(40)
   ]);
   if(proc.error)throw proc.error;
   if(proc.data?.length!==1)throw Error(proc.data?.length?'Há registros duplicados para este CNJ na empresa. Selecione manualmente o processo.':'CNJ não encontrado na carteira autorizada da sua empresa.');
   setRecord(proc.data[0]);
   if(saved.error)setNotice('Cadastro encontrado, mas histórico de consultas não foi lido: '+saved.error.message);
   else setSnapshots(saved.data||[]);
  }catch(e){setError('Consulta de cadastro não concluída: '+String(e.message||e));setRecord(null);setSnapshots([])}
  finally{setLoading(false)}
 },[db,profile?.empresa_id,number]);
 useEffect(()=>{load()},[load]);
 const timeline=useMemo(()=>normalizeLexisJudicialTimeline({process:record||{},snapshots,live}),[record,snapshots,live]);
 const onSubmit=e=>{e.preventDefault();const cnj=normalizeCaseNumber(draft);if(!cnj){setError('Informe um CNJ completo com 20 dígitos.');return}setNumber(cnj)};
 const consult=async()=>{
  if(consulting||!record?.id||!number)return;
  if((range.start&&!range.end)||(!range.start&&range.end)){setError('Preencha as duas datas ou deixe ambas em branco.');return}
  if(range.start&&range.end&&(range.end<range.start||Date.parse(range.end+'T12:00:00Z')-Date.parse(range.start+'T12:00:00Z')>366*86400000)){
   setError('Escolha um intervalo válido de até 12 meses para evitar consultas excessivas.');return
  }
  setConsulting(true);setProgress('Iniciando consulta oficial...');setError('');setNotice('');
  try{
   const {data:{session:current}}=await db.auth.getSession();
   if(!current?.access_token)throw Error('Sessão expirada. Entre novamente.');
   const result=await consultHistoricalCase({
    number,source,start:range.start||undefined,end:range.end||undefined,
    fetchServer:async({number:n,source:s,start,end,page})=>{
     const qs=new URLSearchParams({numero:n,fonte:s,pagina:String(page),...(start?{inicio:start}:{}),...(end?{fim:end}:{}),...(force?{forcar:'1'}:{})});
     const response=await fetch('/api/processos/consulta?'+qs.toString(),{headers:{Authorization:'Bearer '+current.access_token},cache:'no-store'});
     const value=await response.json().catch(()=>({ok:false,error:'Resposta não verificável do servidor.'}));
     if(!response.ok)return {...value,ok:false,sourceErrors:value.sourceErrors||{[s]:value.error||'HTTP '+response.status}};
     return value;
    },
    fetchBrowser:async({number:n,start,end,page})=>browseOfficialDjenNumber({number:n,start,end,page}),
    onProgress:({current,total})=>setProgress('Consultando fontes oficiais: período '+current+' de '+total)
   });
   setLive(result);
   setNotice(result.notice||'As fontes foram consultadas com o resultado indicado.');setProgress('');
   // Atualizar histórico sem disparar nova consulta às fontes.
   const saved=await db.from('crm_judicial_snapshots').select('id,source,checked_at,payload,empresa_id')
    .eq('empresa_id',profile.empresa_id).eq('process_number',number).order('checked_at',{ascending:false}).limit(40);
   if(!saved.error)setSnapshots(saved.data||[]);
  }catch(e){setError('Consulta oficial não confirmada: '+String(e.message||e));setProgress('')}
  finally{setConsulting(false)}
 };
 return <main className="inf-studio" data-lexis-operator="consulta-judicial">
  <header className="reference-header"><div><span className="reference-overline">INFINITUM · INTELIGÊNCIA JUDICIAL</span><h1>Consulta e histórico do processo</h1>
   <p>Publicações DJEN, decisões e movimentos DataJud, com origem, data e disponibilidade de cada fonte.</p></div>
   <div className="reference-actions"><Link href="/processos" className="inf-btn">Processos</Link><Link href="/encerrados" className="inf-btn">Encerrados</Link></div></header>
  <section className="inf-panel"><div className="reference-panel-title"><FileSearch size={18}/><h2>Localizar na carteira da empresa</h2></div>
   <form className="lx-operator-filters" onSubmit={onSubmit}><label className="lx-operator-search"><Search size={15}/>
    <input aria-label="Número do processo CNJ" placeholder="0000000-00.0000.0.00.0000" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <button className="inf-btn primary" type="submit">Abrir histórico</button></form>
   {loading&&<p className="inf-note">Carregando processo e consultas anteriores...</p>}
   {error&&<p role="alert" className="inf-note error">{error}</p>}{notice&&<p role="status" className="inf-note">{notice}</p>}
  </section>
  {record&&<><section className="inf-panel"><div className="reference-panel-title"><Gavel size={19}/><div><h2>{record.cliente||record.protocolo_ref}</h2>
    <p>{record.protocolo_ref} · {record.tribunal||'Tribunal não informado'} · {record.status_interno||'Situação interna não informada'}</p></div></div>
   <p>Última publicação DJEN cadastrada: <strong>{record.djen_ultimo_resumo||'Não confirmada'}</strong> · {fmt(record.djen_ultima_data)}</p>
   <p>Último movimento DataJud cadastrado: <strong>{record.datajud_ultimo_nome||'Não confirmado'}</strong> · {fmt(record.datajud_ultimo_movimento)}</p>
   <div className="lx-operator-filters">
    <label>Fonte<select value={source} onChange={e=>setSource(e.target.value)}><option value="auto">DJEN + DataJud</option><option value="djen">Somente DJEN</option><option value="datajud">Somente DataJud</option></select></label>
    <label>De<input type="date" value={range.start} onChange={e=>setRange({...range,start:e.target.value})}/></label>
    <label>Até<input type="date" value={range.end} onChange={e=>setRange({...range,end:e.target.value})}/></label>
    <label className="lx-operator-checkbox"><input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)}/> Solicitar atualização, mesmo se houver cache válido</label>
   </div>
   <div className="reference-actions"><button className="inf-btn primary" type="button" disabled={consulting} onClick={consult}><RefreshCw size={15}/>{consulting?'Consultando...':'Consultar fontes oficiais agora'}</button>
    <button className="inf-btn" type="button" onClick={load} disabled={loading}>Recarregar histórico salvo</button></div>
   {progress&&<p className="inf-note" role="status">{progress}</p>}
   {live&&<div className="lx-source-status"><strong>Resultado da consulta</strong><p>{live.notice||'Sem observações adicionais'}</p>
    <div className="reference-actions">{['djen','datajud'].map(s=><span className="lx-status lx-status--atencao" key={s}>{s.toUpperCase()}: {states[live.sourceStatus?.[s]]||live.sourceStatus?.[s]||'Não confirmado'}</span>)}</div>
    {(live.sourceErrors?.djen||live.sourceErrors?.datajud)&&<p className="inf-note">Limitações: {['djen','datajud'].map(x=>live.sourceErrors?.[x]?x.toUpperCase()+': '+live.sourceErrors[x]:'').filter(Boolean).join(' · ')}</p>}
   </div>}
  </section>
  <section className="inf-panel"><div className="reference-panel-title"><History size={20}/><div><h2>Movimentações e publicações</h2>
   <p>{timeline.length} registro(s) com evidência; histórico da carteira, cache anterior e desta consulta.</p></div></div>
   {timeline.length===0?<p className="inf-note">Nenhum evento verificável disponível no cadastro e nas consultas acessíveis. Isso não significa que o processo não tenha movimentações.</p>:
   <div className="lx-operator-list">{timeline.map((e,i)=><article key={e.id||e.source+'-'+e.date+'-'+i} className="lx-operator-record">
    <div className="lx-operator-record-top"><span className={'lx-status lx-status--'+(e.kind==='decisao'?'atencao':e.source==='DJEN'?'em_dia':'em_andamento')}>{e.kind==='decisao'?'Possível decisão':e.kind==='publicacao'?'Publicação':'Movimentação'}</span>
     <span className="reference-overline">{src(e.source)} · {fmt(e.date)} {e.cached?'· Histórico anterior':'· Resultado confirmado'}</span></div>
    <h3>{e.title}</h3>{e.description&&<p>{e.description}</p>}
    <div className="reference-actions">{e.url&&<a className="inf-btn" target="_blank" rel="noopener noreferrer" href={e.url}><ExternalLink size={14}/> Abrir fonte oficial</a>}
     {!e.url&&e.source==='DJEN'&&<a className="inf-btn" href="https://comunica.pje.jus.br/" target="_blank" rel="noopener noreferrer">Conferir no portal DJEN</a>}
    </div>
   </article>)}</div>}
   <p className="inf-note">Termos como “sentença” ou “decisão” indicam tipo de movimentação; não confirmam procedência ou improcedência sem ler o inteiro teor. Consultas bloqueadas não são tratadas como ausência de movimentações.</p>
  </section></>}
 </main>;
}
