'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Archive,ChevronLeft,ChevronRight,FileSearch,RefreshCw,Search,ShieldCheck,Users,RotateCcw} from 'lucide-react';
import {isClosedLexisStatus,closedStatusFilters,normalizeCaseNumber} from '../lib/lexis-operator-data.mjs';
import {responsibleDisplay} from '../lib/lexis-operations.mjs';
import {likeTerm} from '../lib/lexis-shared-portfolio.mjs';
const PAGE=50;
const date=x=>x?String(x).slice(0,10).split('-').reverse().join('/'):'Não informado';
export default function LexisClosedCases({db,session}){
 const [profile,setProfile]=useState(null),[members,setMembers]=useState([]),[rows,setRows]=useState([]),[total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [page,setPage]=useState(0),[search,setSearch]=useState(''),[draft,setDraft]=useState('');
 useEffect(()=>{let active=true;(async()=>{
  const res=await db.from('usuarios').select('auth_user_id,empresa_id,nome').eq('auth_user_id',session.user.id).limit(2);
  if(!active)return;
  if(res.error||res.data?.length!==1||!res.data[0].empresa_id){setError('Conta sem vínculo único com a organização Lexis.');setLoading(false);return}
  setProfile(res.data[0]);
  const people=await db.from('usuarios').select('id,auth_user_id,nome').eq('empresa_id',res.data[0].empresa_id).limit(250);
  if(active)setMembers(people.data||[]);
 })();return()=>{active=false}},[db,session.user.id]);
 const load=useCallback(async()=>{
  if(!profile?.empresa_id)return;
  setLoading(true);setError('');
  try{
   let q=db.from('processos').select('id,empresa_id,cliente,protocolo_ref,tribunal,status_interno,ultimo_retorno,proximo_retorno,atendido_por,updated_at,djen_ultimo_resumo,djen_ultima_data,datajud_ultimo_nome',
    {count:'exact'}).eq('empresa_id',profile.empresa_id).in('status_interno',closedStatusFilters);
   if(search)q=q.ilike('protocolo_ref',likeTerm(search));
   const {data,error,count}=await q.order('updated_at',{ascending:false,nullsFirst:false}).range(page*PAGE,(page+1)*PAGE-1);
   if(error)throw error;
   setRows((data||[]).filter(x=>isClosedLexisStatus(x.status_interno)));setTotal(count??0);
  }catch(err){setError('Não foi possível consultar encerrados: '+String(err.message||err));setRows([])}
  finally{setLoading(false)}
 },[db,profile?.empresa_id,page,search]);
 useEffect(()=>{load()},[load]);
 const pages=Math.max(1,Math.ceil(total/PAGE));
 const reopen=async p=>{
  if(!window.confirm('Reabrir este processo como EM ANDAMENTO no controle interno? O histórico judicial será preservado.'))return;
  setBusy(p.id);setError('');setNotice('');
  try{
   const res=await db.from('processos').update({status_interno:'EM ANDAMENTO',updated_at:new Date().toISOString()})
    .eq('id',p.id).eq('empresa_id',profile.empresa_id).eq('status_interno',p.status_interno).select('id').maybeSingle();
   if(res.error||!res.data?.id)throw Error(res.error?.message||'O banco não confirmou a alteração.');
   setNotice('Processo reaberto. Dados históricos preservados.');await load();
  }catch(e){setError('Não foi possível reabrir: '+String(e.message||e))}
  finally{setBusy(null)}
 };
 return <main className="inf-studio" data-lexis-operator="encerrados">
  <header className="reference-header"><div><span className="reference-overline">INFINITUM · CARTEIRA LEXISPREDICT</span><h1>Processos encerrados</h1>
   <p>Histórico completo de processos finalizados internamente. Não são apagados nem considerados ativos.</p></div>
   <div className="reference-actions"><Link href="/processos" className="inf-btn">Voltar aos processos</Link><button type="button" className="inf-btn" onClick={load} disabled={loading}><RefreshCw size={15}/> Atualizar</button></div></header>
  {error&&<p className="inf-note error" role="alert">{error}</p>}{notice&&<p className="inf-note" role="status">{notice}</p>}
  <div className="inf-grid"><div className="inf-stat"><label>Encerrados na organização</label><strong>{total.toLocaleString('pt-BR')}</strong></div>
   <div className="inf-stat"><label>Exibidos nesta página</label><strong>{rows.length}</strong></div>
   <div className="inf-stat"><label>Situação</label><strong style={{fontSize:19}}>Encerrado</strong></div></div>
  <section className="inf-panel"><h2><Search size={17}/> Localizar processo encerrado</h2>
   <form className="lx-operator-filters" onSubmit={e=>{e.preventDefault();setSearch(draft.trim());setPage(0)}}>
    <label className="lx-operator-search"><Search size={15}/><input aria-label="Buscar CNJ nos encerrados" placeholder="Número CNJ" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <button type="submit" className="inf-btn primary">Buscar</button><button type="button" className="inf-btn" onClick={()=>{setSearch('');setDraft('');setPage(0)}}>Limpar</button>
   </form>
   {loading&&<p className="inf-note">Carregando processos encerrados...</p>}
   <div className="lx-operator-list">{rows.map(p=><article className="lx-operator-record" key={p.id}>
    <div className="lx-operator-record-top"><span className="lx-status lx-status--encerrado">Encerrado</span><small>Atualizado: {date(p.updated_at)}</small></div>
    <h3>{p.cliente||'Cliente não identificado'}</h3>
    <p>{p.protocolo_ref||'CNJ não informado'} · {p.tribunal||'Tribunal não informado'}</p>
    <small>Último atendimento: {date(p.ultimo_retorno)} · Responsável: <strong>{responsibleDisplay(p.atendido_por,members)}</strong></small>
    {(p.djen_ultimo_resumo||p.datajud_ultimo_nome)&&<p><strong>Último registro oficial:</strong> {p.djen_ultimo_resumo||p.datajud_ultimo_nome}{p.djen_ultima_data?' · '+date(p.djen_ultima_data):''}</p>}
    <div className="reference-actions">
     {normalizeCaseNumber(p.protocolo_ref)&&<Link className="inf-btn primary" href={'/consulta-judicial?numero='+encodeURIComponent(p.protocolo_ref)}><FileSearch size={15}/> Consultar publicações e movimentações</Link>}
     <button className="inf-btn" type="button" disabled={busy===p.id} onClick={()=>reopen(p)}><RotateCcw size={15}/> Reabrir</button>
    </div>
   </article>)}
   {!loading&&!rows.length&&<p className="inf-note">Nenhum processo encerrado encontrado nesta seleção.</p>}</div>
   <div className="lx-operator-pagination"><span>Página {page+1} de {pages}</span><div className="reference-actions">
    <button className="inf-btn" disabled={!page||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
    <button className="inf-btn" disabled={page+1>=pages||loading} onClick={()=>setPage(p=>p+1)}>Próxima</button>
   </div></div>
  </section>
 </main>;
}
