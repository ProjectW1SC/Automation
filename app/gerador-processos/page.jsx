'use client';
import {useCallback,useEffect,useState} from 'react';
import {FileSearch,RefreshCw,Search,Plus,ExternalLink,ShieldCheck} from 'lucide-react';
import {normalizeOfficeCNJ} from '../../lib/office-core.mjs';
import {browseOfficialDjenSearch} from '../../lib/blackhole-public-djen-browser.mjs';
import {PUBLIC_DATAJUD_COURTS} from '../../lib/blackhole-datajud-discovery.mjs';
import SecuredWorkspace from '../../components/secured-workspace';
const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const initialStart=()=>{const d=new Date();d.setDate(d.getDate()-14);return d.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})};
function Generator({db,session}){
 const [form,setForm]=useState({term:'busca e apreensão',court:'',start:initialStart(),end:now(),page:1});
 const [sourceMode,setSourceMode]=useState('datajud');
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[status,setStatus]=useState('idle');
 const [manual,setManual]=useState({cnj:'',title:'',tribunal:''});
 const load=useCallback(async()=>{
  const r=await db.from('crm_process_candidates').select('*').order('created_at',{ascending:false}).limit(250);
  if(r.error)setNotice('Não foi possível carregar resultados anteriores: '+r.error.message);
  else setRows(r.data||[]);
 },[db]);
 useEffect(()=>{load()},[load]);
 async function consult(e){
  e.preventDefault();setBusy(true);setStatus('running');setNotice('Consultando '+(sourceMode==='datajud'?'DataJud':'DJEN')+' do CNJ...');
  try{
   const {data:{session:s}}=await db.auth.getSession();
   if(!s?.access_token)throw Error('Sessão expirada.');
   if(sourceMode==='datajud'&&!form.court)throw Error('Selecione um tribunal para pesquisar classes/assuntos no DataJud.');
   const endpoint=sourceMode==='datajud'?'/api/gerador-processos/datajud':'/api/gerador-processos';
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},body:JSON.stringify(form)});
   const data=await response.json();
   if(!data.ok&&sourceMode==='djen'&&response.status===503){
    setNotice('A API DJEN bloqueou a conexão do servidor. Tentando a rota pública pelo seu navegador...');
    const browserResult=await browseOfficialDjenSearch(form);
    let saved=true,saveError='';
    if(browserResult.items.length){
     const write=await db.from('crm_process_candidates').upsert(browserResult.items.map(row=>({...row,owner_id:session.user.id})),
      {onConflict:'owner_id,process_number,query_term'});
     if(write.error){saved=false;saveError=write.error.message}
    }
    if(saved)await load();else setRows(browserResult.items.map((x,i)=>({...x,id:'temp-'+i,created_at:browserResult.checkedAt})));
    setStatus('ok');setNotice(browserResult.notice+(saveError?' · Resultados mantidos nesta tela, mas não salvos: '+saveError:'')+' · Consulta feita pelo navegador.');
    return;
   }
   if(!data.ok)throw Error(data.error||'Falha na consulta oficial.');
   setStatus('ok');setNotice(data.notice+(data.saveError?' '+data.saveError:'')+(data.limited?' · Resultados limitados pela consulta.':''));
   await load();
   if(!data.persisted)setRows(data.items.map((x,i)=>({...x,id:'temp-'+i,created_at:data.checkedAt})));
  }catch(e){setStatus('error');setNotice(e.message)}finally{setBusy(false)}
 }
 async function consultDjenBrowser(){
  if(busy)return;setBusy(true);setStatus('running');setNotice('Consultando a API pública DJEN a partir do navegador...');
  try{
   const result=await browseOfficialDjenSearch(form);
   let saved=true,saveError='';
   if(result.items.length){
    const r=await db.from('crm_process_candidates').upsert(result.items.map(row=>({...row,owner_id:session.user.id})),
      {onConflict:'owner_id,process_number,query_term'});
    if(r.error){saved=false;saveError=r.error.message}
   }
   if(saved)await load();
   else setRows(result.items.map((x,i)=>({...x,id:'temp-'+i,created_at:result.checkedAt})));
   setStatus('ok');
   setNotice(result.notice+(saveError?' Resultados obtidos mas não persistidos: '+saveError:''));
  }catch(e){setStatus('error');setNotice('DJEN via navegador não confirmado: '+e.message)}
  finally{setBusy(false)}
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
  const source=row.source==='DataJud'?'DataJud':'DJEN';
  const r=await db.from('office_cases').insert({owner_id:session.user.id,process_number:row.process_number,
    title:source+' · '+String(row.headline||'Candidato processual').slice(0,180),tribunal:row.tribunal||null,
    subject:row.query_term||null,status:'ativo',
    notes:'Candidato identificado na fonte '+source+'; verificar vínculo, existência e situação processual antes de prosseguir.'});
  setBusy(false);
  setNotice(r.error?'Não foi possível cadastrar CNJ: '+r.error.message:'Processo '+row.process_number+' adicionado à carteira jurídica para validação.');
 }
 return <main className="inf-studio"><header className="inf-heading"><div>
  <small>BLACKHOLE / GERADOR DE PROCESSOS</small><h1>Gerador de processos</h1>
  <p>Pesquise classes ou assuntos por tribunal no DataJud ou publicações no DJEN. O CNJ é extraído somente de campos oficiais; resultados precisam de conferência.</p></div>
  <a className="inf-btn" href="/processos"><FileSearch size={15}/> Minha carteira</a></header>
  <section className="inf-panel"><h2>Filtros de consulta judicial</h2>
   <div className="office-action-row" style={{marginBottom:15}}>
    <button type="button" className={'inf-btn '+(sourceMode==='datajud'?'primary':'')} onClick={()=>setSourceMode('datajud')} aria-pressed={sourceMode==='datajud'}>DataJud · classe/assunto</button>
    <button type="button" className={'inf-btn '+(sourceMode==='djen'?'primary':'')} onClick={()=>setSourceMode('djen')} aria-pressed={sourceMode==='djen'}>DJEN · publicações</button>
   </div>
   <form onSubmit={consult}><div className="inf-fields">
     <label>Tipo ou expressão<input required minLength={4} maxLength={110} value={form.term} onChange={e=>setForm({...form,term:e.target.value})}/></label>
     <label>Tribunal<select value={form.court} onChange={e=>setForm({...form,court:e.target.value})}><option value="">{sourceMode==='datajud'?'Selecione um tribunal':'Todos'}</option>{PUBLIC_DATAJUD_COURTS.map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Página oficial<input type="number" min="1" max="25" step="1" value={form.page} onChange={e=>setForm({...form,page:Number(e.target.value)||1})}/></label>
     {sourceMode==='djen'&&<><label>Data inicial da publicação<input type="date" required value={form.start} onChange={e=>setForm({...form,start:e.target.value})}/></label>
     <label>Data final da publicação<input type="date" required value={form.end} onChange={e=>setForm({...form,end:e.target.value})}/></label></>}
    </div><div className="inf-row-end"><button className="inf-btn primary" type="submit" disabled={busy}><Search size={15}/> {busy?'Consultando...':'Buscar candidatos oficiais'}</button>
    {sourceMode==='djen'&&<button className="inf-btn" type="button" disabled={busy} onClick={consultDjenBrowser}>Pesquisar DJEN pelo meu navegador</button>}</div>
   </form>
   <div className="inf-note">DataJud: pesquisa por classe/assunto em um tribunal, até 20 candidatos por consulta; a data exibida é a de ajuizamento, não de publicação. DJEN: pesquisa de publicações em janela de até 31 dias. Erros 403/429 indicam bloqueio real, não ausência de processos.</div>
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
   <div className="inf-table-wrap"><table className="inf-table"><thead><tr><th>CNJ</th><th>Tribunal</th><th>Data oficial (ajuizamento ou publicação)</th><th>Natureza</th><th>Evidência</th><th>Ação</th></tr></thead><tbody>{rows.map(row=>
    <tr key={row.id}><td><strong>{row.process_number}</strong>{row.source_url&&<div><a href={row.source_url} target="_blank" rel="noreferrer">Publicação <ExternalLink size={11}/></a></div>}</td>
    <td>{row.tribunal||'—'}</td><td>{row.official_date||'—'}</td><td><span className="inf-badge">{row.source||'Oficial'}</span> {row.headline||'Registro'}</td><td>{String(row.evidence||'').slice(0,190)||'Sem teor disponível'}</td>
    <td><button className="inf-btn" disabled={busy} onClick={()=>add(row)}><Plus size={13}/> Salvar na carteira</button></td></tr>)}</tbody></table></div>}
  </section>
 </main>;
}
export default function GeneratorPage(){return <SecuredWorkspace active="Gerador de processos">{({db,session})=><Generator db={db} session={session}/>}</SecuredWorkspace>}
