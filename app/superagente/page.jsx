'use client';
import {useState} from 'react';
import {Bot,Send,ShieldCheck,ClipboardCopy,FileSearch} from 'lucide-react';
import SecuredWorkspace from '../../components/secured-workspace';
function SuperAgent({db}){
 const [prompt,setPrompt]=useState('Faça um relatório dos processos e das consultas oficiais registradas na carteira.');
 const [reply,setReply]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function ask(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw Error('Sessão expirada.');
   const r=await fetch('/api/superagente',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({prompt})});
   const payload=await r.json();if(!payload.ok)throw Error(payload.error||'Não foi possível analisar');
   setReply(payload);
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <main className="inf-studio">
  <header className="inf-heading"><div><small>LEXISPREDICT / CENTRAL DE INTELIGÊNCIA</small><h1>Superagente Lexis</h1>
   <p>Roteador por tarefas: atendimento, dossiê, investigação, relatórios e análise processual. Usa exclusivamente informações autorizadas e evidências armazenadas.</p></div>
   <a className="inf-btn" href="/processos"><FileSearch size={15}/> Fontes judiciais</a></header>
  <div className="inf-grid">
   {['Análise processual','Investigação','Dossiê','Atendimento'].map((x,i)=><div className="inf-stat" key={x}><label>Especialista {i+1}</label><strong style={{fontSize:15}}>{x}</strong></div>)}
  </div>
  <div className="inf-2col"><section className="inf-panel"><h2><Bot size={16}/> Nova solicitação</h2>
   <p>Descreva a tarefa; para casos específicos, utilize o CNJ cadastrado. É uma análise local das informações do CRM, sem mensagens automáticas.</p>
   <form onSubmit={ask}><label className="inf-field">Pedido<textarea required minLength={6} maxLength={1800} rows={7} value={prompt} onChange={e=>setPrompt(e.target.value)}/></label>
    <div className="inf-row-end"><button className="inf-btn primary" disabled={busy}><Send size={15}/> {busy?'Analisando...':'Analisar evidências'}</button></div></form>
   <div className="inf-note"><ShieldCheck size={14}/> Motor atual: regras verificáveis do LexisPredict. O modelo generativo, o envio de WhatsApp e as ações externas não estão conectados nesta tela.</div>
  </section>
  <section className="inf-panel"><h2>Resultado e rastreabilidade</h2>
   {error&&<p className="inf-note error" role="alert">{error}</p>}
   {reply?<><div className="inf-toolbar"><span className="inf-badge">{reply.review.task}</span><span className="inf-badge">Dados autorizados</span>
     <button className="inf-btn" type="button" onClick={()=>navigator.clipboard?.writeText(reply.review.answer)}><ClipboardCopy size={13}/> Copiar</button></div>
    <div className="inf-chat-output">{reply.review.answer}</div><p className="inf-note">{reply.notice}</p></>:
    <div className="inf-empty">Envie uma tarefa para gerar o resumo com dados confirmados, fontes e limites.</div>}
  </section></div>
 </main>;
}
export default function SuperAgentPage(){return <SecuredWorkspace active="Superagente">{({db})=><SuperAgent db={db}/>}</SecuredWorkspace>}
