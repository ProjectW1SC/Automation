'use client';
import {useCallback,useEffect,useState} from 'react';
import {FileSearch,RefreshCw,Search,Plus,ExternalLink,ShieldCheck} from 'lucide-react';
import {normalizeOfficeCNJ} from '../../lib/office-core.mjs';
import SecuredWorkspace from '../../components/secured-workspace';
const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const initialStart=()=>{const d=new Date();d.setDate(d.getDate()-14);return d.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})};
function Generator({db,session}){
 const [form,setForm]=useState({term:'busca e apreensão',court:'',start:initialStart(),end:now()});
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[status,setStatus]=useState('idle');
 const [manual,setManual]=useState({cnj:'',title:'',tribunal:''});
 const load=useCallback(async()=>{
  const r=await db.from('crm_process_candidates').select('*').order('created_at',{ascending:false}).limit(250);
  if(r.error)setNotice('Não foi possível carregar resultados anteriores: '+r.error.message);
  else setRows(r.data||[]);
 },[db]);
 useEffect(()=>{load()},[load]);
 async function consult(e){
  e.preventDefault();setBusy(true);setStatus('running');setNotice('Consultando a API pública do CNJ...');
  try{
   const {data:{session:s}}=await db.auth.getSession();
   if(!s?.access_token)throw Error('Sessão expirada.');
   const response=await fetch('/api/gerador-processos',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify(form)});
   const data=await response.json();
   if(!data.ok)throw Error(data.error||'Falha na consulta oficial.');
   setStatus('ok');setNotice(data.notice+(data.saveError?' '+data.saveError:'')+(data.limited?' · Lista limitada a 50 registros.':''));
   await load();
   if(!data.persisted)setRows(data.items.map((x,i)=>({...x,id:'temp-'+i,created_at:data.checkedAt})));
  }catch(e){setStatus('error');setNotice(e.message)}finally{setBusy(false)}
 }
 async function addManual(e){
  e.preventDefault();if(busy)return;setBusy(true);setNotice('');
  try{
   const number=normalizeOfficeCNJ(manual.cnj);
   if(!number)throw Error('Informe o número CNJ com 20 dígitos.');
   if(manual.title.trim().length<3)throw Error('Informe a descrição do caso.');
   const row={owner_id:session.user.id,process_number:number,title:manual.title.trim().slice(0,180),
    tribunal:manual.tribunal.trim().toUpperCase().slice(0,40)||null,status:'ativo',
    notes:'Cadastro manual; ainda não constitui confirmação de tramitação no tribunal.'};
   const {data,error}=await db.from('office_cases').insert(row).select('id').single();
   if(error)throw Error(error.message);
   if(!data?.id)throw Error('Cadastro não confirmou o salvamento.');
   setManual({cnj:'',title:'',tribunal:''});setStatus('ok');
   setNotice('Processo cadastrado no escritório com sucesso. Consulte DataJud e DJEN em Processos para verificar o CNJ.');
  }catch(e){setStatus('error');setNotice('Cadastro não concluído: '+e.message)}
  finally{setBusy(false)}
 }
 async function add(row){
  setBusy(true);
  const r=await db.from('office_cases').insert({owner_id:session.user.id,process_number:row.process_number,
    title:'DJEN · '+String(row.headline||'Candidato processual').slice(0,180),tribunal:row.tribunal||null,
    subject:row.query_term||null,status:'ativo',
    notes:'Candidato identificado em publicação DJEN; conferir dados e vínculo antes de prosseguir.'});
  setBusy(false);
  setNotice(r.error?'Não foi possível cadastrar CNJ: '+r.error.message:'Processo '+row.process_number+' adicionado à carteira jurídica para validação.');
 }
 return <main className="inf-studio"><header className="inf-heading"><div>
  <small>BLACKHOLE / GERADOR DE PROCESSOS</small><h1>Gerador de processos</h1>
  <p>Busca pública por texto no DJEN, com filtros por tribunal e data. O CNJ é extraído exclusivamente do campo oficial; não há dedução de nomes ou contatos privados.</p></div>
  <a className="inf-btn" href="/processos"><FileSearch size={15}/> Minha carteira</a></header>
  <section className="inf-panel"><h2>Filtros de consulta judicial</h2>
   <form onSubmit={consult}><div className="inf-fields">
     <label>Tipo ou expressão<input required minLength={4} maxLength={110} value={form.term} onChange={e=>setForm({...form,term:e.target.value})}/></label>
     <label>Tribunal<select value={form.court} onChange={e=>setForm({...form,court:e.target.value})}><option value="">Todos</option>{['TJSP','TJRJ','TJMG','TJPR','TJBA','TJRS','TJSC','TJPE','TRT2','TRT3','TRT4','TRF1','TRF2','TRF3','STJ','TST'].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Data inicial<input type="date" required value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
     <label>Data final<input type="date" required value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label>
    </div><div className="inf-row-end"><button className="inf-btn primary" type="submit" disabled={busy}><Search size={15}/> {busy?'Consultando o DJEN...':'Gerar candidatos oficiais'}</button></div>
   </form>
   <div className="inf-note">Consultas em janelas de no máximo 31 dias. O CNJ pode bloquear esta rede (403/429). Quando houver bloqueio, use o cadastro direto e a consulta por número na aba Processos; não serão inventados candidatos.</div>
  </section>
  <section className="inf-panel"><h2><ShieldCheck size={16}/> Cadastrar CNJ manualmente</h2>
   <p>Alternativa gratuita que funciona mesmo quando o DJEN bloqueia pesquisas por palavras. Cadastro não implica confirmação de tramitação.</p>
   <form onSubmit={addManual}><div className="inf-fields">
    <label>Número CNJ<input required value={manual.cnj} onChange={e=>setManual({...manual,cnj:e.target.value})} placeholder="0000000-00.0000.0.00.0000" maxLength={32}/></label>
    <label>Nome do caso<input required minLength={3} maxLength={180} value={manual.title} onChange={e=>setManual({...manual,title:e.target.value})} placeholder="Descrição do processo"/></label>
    <label>Tribunal (opcional)<input maxLength={40} value={manual.tribunal} onChange={e=>setManual({...manual,tribunal:e.target.value})} placeholder="TJSP, TRT2, TRF3..."/></label>
   </div>
   <div className="inf-row-end"><button className="inf-btn primary" disabled={busy} type="submit"><Plus size={14}/> Cadastrar CNJ manualmente</button></div></form>
  </section>
  {notice&&<p className={'inf-note '+(status==='error'?'error':'')} role="status">{notice}</p>}
  <section className="inf-panel"><div className="inf-toolbar"><h2>Processos encontrados e registrados</h2><button className="inf-btn" onClick={load}><RefreshCw size={14}/> Atualizar</button></div>
   {!rows.length?<div className="inf-empty">Ainda não existem candidatos registrados. Execute uma consulta oficial acima.</div>:
   <div className="inf-table-wrap"><table className="inf-table"><thead><tr><th>CNJ</th><th>Tribunal</th><th>Data da publicação</th><th>Natureza</th><th>Evidência</th><th>Ação</th></tr></thead><tbody>{rows.map(row=>
    <tr key={row.id}><td><strong>{row.process_number}</strong>{row.source_url&&<div><a href={row.source_url} target="_blank" rel="noreferrer">Publicação <ExternalLink size={11}/></a></div>}</td>
    <td>{row.tribunal||'—'}</td><td>{row.official_date||'—'}</td><td>{row.headline||'Publicação'}</td><td>{String(row.evidence||'').slice(0,190)||'Sem teor disponível'}</td>
    <td><button className="inf-btn" disabled={busy} onClick={()=>add(row)}><Plus size={13}/> Salvar na carteira</button></td></tr>)}</tbody></table></div>}
  </section>
 </main>;
}
export default function GeneratorPage(){return <SecuredWorkspace active="Gerador de processos">{({db,session})=><Generator db={db} session={session}/>}</SecuredWorkspace>}
