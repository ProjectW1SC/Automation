'use client';
import {useCallback,useEffect,useState} from 'react';
import {FileSearch,RefreshCw,Search,Plus,ExternalLink,ShieldCheck} from 'lucide-react';
import {normalizeOfficeCNJ} from '../../lib/office-core.mjs';
import {browseOfficialDjenSearch} from '../../lib/blackhole-public-djen-browser.mjs';
import {splitDjenCalendarMonths} from '../../lib/judicial-history-client.mjs';
import {PUBLIC_DATAJUD_COURTS} from '../../lib/blackhole-datajud-discovery.mjs';
import {saveNamedCandidate} from '../../lib/office-candidate-save.mjs';
import {officialAccessHelp} from '../../lib/official-access-guidance.mjs';
import SecuredWorkspace from '../../components/secured-workspace';
const now=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const initialStart=()=>{const d=new Date();d.setDate(d.getDate()-14);return d.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})};
function Generator({db,session}){
 const [form,setForm]=useState({term:'busca e apreensão',court:'',start:initialStart(),end:now(),page:1});
 const [sourceMode,setSourceMode]=useState('datajud');
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[status,setStatus]=useState('idle');
 const [accessHelp,setAccessHelp]=useState(null);
 const [manual,setManual]=useState({cnj:'',title:'',tribunal:''});
 const [personNames,setPersonNames]=useState({});
 const load=useCallback(async()=>{
  const r=await db.from('crm_process_candidates').select('*').order('created_at',{ascending:false}).limit(250);
  if(r.error)setNotice('Não foi possível carregar resultados anteriores: '+r.error.message);
  else setRows(r.data||[]);
 },[db]);
 useEffect(()=>{load()},[load]);
 async function runDjenMonths({browserOnly=false,bearer='' }={}){
  const windows=splitDjenCalendarMonths({start:form.start,end:form.end});
  const records=[],browserRows=[];let completed=0,failed='',saved=true,saveError='';
  for(const [i,range] of windows.entries()){
   setNotice('DJEN · consulta mensal '+(i+1)+'/'+windows.length+' ('+range.start+' a '+range.end+')');
   const month={...form,start:range.start,end:range.end};
   let data=null,viaBrowser=browserOnly;
   if(!browserOnly){
    try{
     const response=await fetch('/api/gerador-processos',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+bearer},
      body:JSON.stringify(month),cache:'no-store'});
     data=await response.json();
     if(!data?.ok){
      if(response.status===403||response.status===429){
       setAccessHelp(officialAccessHelp({status:response.status},'djen'));
       failed='DJEN respondeu '+response.status+'; consulta bloqueada ou limitada na origem.';break}
      if(response.status===502||response.status===503)viaBrowser=true;
      else{failed=String(data?.error||'Consulta mensal inválida.');break}
     }
    }catch{viaBrowser=true}
   }
   if(viaBrowser){
    try{data=await browseOfficialDjenSearch(month);browserRows.push(...(data.items||[]))}
    catch(err){failed='DJEN pelo navegador: '+String(err.message||err).slice(0,210);setAccessHelp(officialAccessHelp(err,'djen'));break}
   }
   if(!data?.ok){failed='O serviço DJEN não confirmou a consulta de '+range.start+' a '+range.end;break}
   records.push(...(data.items||[]));completed++;
   if(data.persisted===false){saved=false;saveError=String(data.saveError||'Resultado sem confirmação de salvamento.')}
  }
  if(browserRows.length){
   const write=await db.from('crm_process_candidates').upsert(browserRows.map(row=>({...row,owner_id:session.user.id})),
    {onConflict:'owner_id,process_number,query_term'});
   if(write.error){saved=false;saveError='Registros do navegador não salvos: '+write.error.message}
  }
  if(completed===0)throw Error(failed||'Nenhuma consulta DJEN foi confirmada.');
  const unique=[...new Map(records.map(row=>[row.process_number+'|'+(row.external_ref||row.official_date||row.headline),row])).values()];
  await load();
  if(!saved)setRows(old=>[...unique.map((x,i)=>({...x,id:'temp-'+i,created_at:new Date().toISOString()})),...old].slice(0,250));
  setStatus(completed===windows.length?'ok':'error');
  setNotice(completed+'/'+windows.length+' meses consultados. '+unique.length+' publicações verificáveis retornadas. '+
   (failed?'Consulta parcial; restantes não confirmados: '+failed+'. ':'')+
   (saveError?'Atenção ao salvamento: '+saveError+'. ':'')+
   'Resultados não encontrados não significam ausência de processos.');
 }
 async function consult(e){
  e.preventDefault();setAccessHelp(null);setBusy(true);setStatus('running');setNotice('Consultando '+(sourceMode==='datajud'?'DataJud':'DJEN')+' do CNJ...');
  try{
   const {data:{session:s}}=await db.auth.getSession();
   if(!s?.access_token)throw Error('Sessão expirada.');
   if(sourceMode==='djen'){await runDjenMonths({bearer:s.access_token});return}
   if(!form.court)throw Error('Selecione um tribunal para pesquisar classes/assuntos no DataJud.');
   const response=await fetch('/api/gerador-processos/datajud',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},
    body:JSON.stringify(form),cache:'no-store'});
   const data=await response.json();
   if(!data.ok)throw Error(data.error||'Falha na consulta oficial.');
   setStatus('ok');setNotice(data.notice+(data.saveError?' '+data.saveError:'')+(data.limited?' · Resultados limitados pela consulta.':''));
   await load();
   if(!data.persisted)setRows(data.items.map((x,i)=>({...x,id:'temp-'+i,created_at:data.checkedAt})));
  }catch(err){setStatus('error');setNotice(String(err.message||err));setAccessHelp(officialAccessHelp(err,sourceMode))}finally{setBusy(false)}
 }
 async function consultDjenBrowser(){
  if(busy)return;setAccessHelp(null);setBusy(true);setStatus('running');
  try{await runDjenMonths({browserOnly:true})}
  catch(err){setStatus('error');setNotice('DJEN via navegador não confirmado: '+String(err.message||err));setAccessHelp(officialAccessHelp(err,'djen'))}
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
  if(busy)return;setBusy(true);setStatus('running');setNotice('Salvando contato e processo com nome identificado...');
  try{
   const saved=await saveNamedCandidate(db,{row,ownerId:session.user.id,
    enteredName:personNames[row.id]??''});
   setStatus('ok');setNotice('Contato '+saved.name+' '+(saved.existing?'vinculado ao processo existente.':'e ficha processual criados.')+' Confira a identidade antes de qualquer comunicação.');
  }catch(e){setStatus('error');setNotice('Cadastro não concluído: '+e.message)}
  finally{setBusy(false)}
 }
 async function addVerifiedBatch(){
  if(busy)return;setBusy(true);setStatus('running');let saved=0,errors=[];
  const candidates=rows.filter(r=>r.person_name&&r.person_name_source==='DJEN_parte').slice(0,30);
  for(const row of candidates){
   try{await saveNamedCandidate(db,{row,ownerId:session.user.id,enteredName:personNames[row.id]||''});saved++}
   catch(e){errors.push(row.process_number+': '+String(e.message||e).slice(0,110))}
  }
  setBusy(false);setStatus(errors.length?'error':'ok');
  setNotice(saved+' processos vinculados a contatos com nome de parte informado pelo DJEN.'+
   (errors.length?' · Não concluídos: '+errors.slice(0,3).join(' | '):'')+' · Nenhuma mensagem foi enviada.');
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
   <div className="inf-note">DataJud: pesquisa por classe/assunto em um tribunal, até 20 candidatos por consulta; a data exibida é a de ajuizamento, não de publicação. DJEN: datas longas são divididas automaticamente em consultas mensais de até 31 dias. Erros 403/429 representam bloqueios reais; resultados anteriores permanecem preservados.</div>
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
  {accessHelp&&<section className="office-official-access" role="status" aria-label="Orientações para validação judicial">
   <div className="office-official-access-heading"><ShieldCheck size={20}/><strong>{accessHelp.action==='manual_check'?'Validação humana no portal oficial':'Consulta oficial temporariamente indisponível'}</strong></div>
   <p>{accessHelp.message}</p>
   <div className="office-official-access-actions"><a className="inf-btn primary" href={accessHelp.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Abrir portal oficial e conferir CAPTCHA, se solicitado</a>
    <button className="inf-btn" type="button" disabled={busy} onClick={()=>{setAccessHelp(null);if(sourceMode==='djen')consultDjenBrowser();else setNotice('Use o botão Buscar candidatos oficiais após conferir o portal.')}}>Voltar à consulta</button></div>
   <small>Esta assistência não contorna CAPTCHA e não registra movimentação sem evidência oficial.</small>
  </section>}
  <section className="inf-panel"><div className="inf-toolbar"><h2>Processos encontrados e registrados</h2><div className="office-action-row"><button className="inf-btn" disabled={busy||!rows.some(r=>r.person_name_source==='DJEN_parte')} onClick={addVerifiedBatch}>Cadastrar em lote partes identificadas (até 30)</button><button className="inf-btn" onClick={load}><RefreshCw size={14}/> Atualizar</button></div></div><p className="inf-note">O nome deve vir de campo oficial do DJEN ou ser preenchido e confirmado pelo operador. O DataJud público não traz nomes de partes. Salvar um contato não autoriza enviar mensagem.</p>
   {!rows.length?<div className="inf-empty">Ainda não existem candidatos registrados. Execute uma consulta oficial acima.</div>:
   <div className="inf-table-wrap"><table className="inf-table"><thead><tr><th>CNJ</th><th>Tribunal</th><th>Data oficial (ajuizamento ou publicação)</th><th>Natureza</th><th>Nome da pessoa / contato</th><th>Evidência</th><th>Ação</th></tr></thead><tbody>{rows.map(row=>
    <tr key={row.id}><td><strong>{row.process_number}</strong>{row.source_url&&<div><a href={row.source_url} target="_blank" rel="noreferrer">Publicação <ExternalLink size={11}/></a></div>}</td>
    <td>{row.tribunal||'—'}</td><td>{row.official_date||'—'}</td><td><span className="inf-badge">{row.source||'Oficial'}</span> {row.headline||'Registro'}</td><td><label className="generator-person-cell"><span>{row.person_name_source==='DJEN_parte'?'Parte identificada na fonte':row.person_name_source==='DJEN_destinatario'?'Destinatário · confira se é cliente':'Nome a confirmar'}</span><input aria-label={'Nome da pessoa do processo '+row.process_number} type="text" maxLength={180} placeholder="Nome completo da pessoa" value={personNames[row.id]??row.person_name??''} onChange={e=>setPersonNames(old=>({...old,[row.id]:e.target.value}))}/></label></td><td>{String(row.evidence||'').slice(0,190)||'Sem teor disponível'}</td>
    <td><button className="inf-btn" disabled={busy||!String(personNames[row.id]??row.person_name??'').trim()} onClick={()=>add(row)}><Plus size={13}/> Salvar cliente + processo</button></td></tr>)}</tbody></table></div>}
  </section>
 </main>;
}
export default function GeneratorPage(){return <SecuredWorkspace active="Gerador de processos">{({db,session})=><Generator db={db} session={session}/>}</SecuredWorkspace>}
