'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Plus,Search,BriefcaseBusiness,BookOpen,Layers3,PlugZap,Send,Copy,ShieldCheck,Bot,PanelLeftClose,PanelLeftOpen,FileText,Scale,Clock3} from 'lucide-react';
import SecuredWorkspace from '../../components/secured-workspace';
import {OFFICE_AGENTS} from '../../lib/office-core.mjs';
import {runBlackholeQwen,stopBlackholeQwen} from '../../lib/blackhole-local-llm.mjs';
const ACTIONS=[
 {label:'Analisar processos',prompt:'Analise os processos cadastrados e indique pendências documentadas sem inventar movimentações.',icon:Scale},
 {label:'Revisar prazos',prompt:'Faça um relatório dos processos e consultas oficiais para orientar a conferência dos próximos prazos.',icon:Clock3},
 {label:'Preparar petição',prompt:'Indique os documentos e os fatos que devem ser conferidos antes de elaborar uma petição com base no processo.',icon:FileText},
 {label:'Atendimento',prompt:'Prepare orientações para revisar mensagens de clientes, sem enviar respostas automaticamente.',icon:Bot}
];
const tabs=[{id:'nova',title:'Nova conversa',icon:Plus},{id:'historico',title:'Buscar conversas',icon:Search},{id:'habilidades',title:'Habilidades',icon:BookOpen},{id:'modelos',title:'Modelos',icon:Layers3},{id:'conectores',title:'Conectores',icon:PlugZap}];
function Console({db,session}){
 const [prompt,setPrompt]=useState(''),[messages,setMessages]=useState([]),[history,setHistory]=useState([]);
 const [tab,setTab]=useState('nova'),[expanded,setExpanded]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState('');
 const [engine,setEngine]=useState('evidencias');
 const [externalAiConsent,setExternalAiConsent]=useState(false);
 const [qwenConsent,setQwenConsent]=useState(false),[modelProgress,setModelProgress]=useState('');
 useEffect(()=>()=>stopBlackholeQwen(),[]);
 const load=useCallback(async()=>{
  const {data,error}=await db.from('office_agent_runs').select('id,task,result,created_at,status').eq('owner_id',session.user.id)
   .eq('agent','superagente').order('created_at',{ascending:false}).limit(45);
  if(error)setNotice('Histórico não disponível: '+error.message);else setHistory(data||[]);
 },[db,session.user.id]);
 useEffect(()=>{load()},[load]);
 function newChat(){setMessages([]);setPrompt('');setNotice('');setTab('nova')}
 function openHistory(row){setMessages([
  {role:'user',content:String(row.result?.userPrompt||row.task).trim()},{role:'assistant',content:String(row.result?.answer||'Resposta indisponível no histórico.'),review:row.result?.review||null}
 ]);setTab('nova');setNotice('Conversa recuperada do histórico do CRM.')}
 function chooseAction(q){setPrompt(q);setTab('nova')}
 async function ask(e){e?.preventDefault();const q=prompt.trim();if(!q||busy)return;
  setBusy(true);setNotice('');setModelProgress('');
  try{
   let payload;
   if(engine==='qwen'){
    const out=await runBlackholeQwen(q,messages.slice(-2).map(x=>({role:x.role,content:x.content})),progress=>{
     setModelProgress(progress.status==='progress'?'Baixando Qwen: '+progress.progress+'%':String(progress.message||'Gerando resposta local...'));
    },{consent:qwenConsent});
    payload={ok:true,reply:out.reply,model:out.model,notice:'Resposta gerada no navegador com Qwen 0.5B (WebGPU). Não foi enviado conteúdo a APIs de IA.'};
   }else{
    if(engine==='online'&&!externalAiConsent)throw Error('Marque a autorização para enviar esta pergunta ao modelo online.');
    const {data:{session:s}}=await db.auth.getSession();if(!s?.access_token)throw Error('Sessão expirada.');
    const response=await fetch('/api/superagente',{method:'POST',
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+s.access_token},
     body:JSON.stringify({prompt:q,externalAiConsent:engine==='online'&&externalAiConsent,messages:messages.slice(-8).map(x=>({role:x.role,content:x.content}))})});
    payload=await response.json();
   }
   if(!payload?.ok||typeof payload.reply!=='string')throw Error(payload?.error||'Não foi possível responder');
   const answer=payload.reply.trim();if(!answer)throw Error('Nenhuma resposta foi produzida.');
   setMessages(old=>[...old,{role:'user',content:q},{role:'assistant',content:answer,review:payload.review||null}]);
   setPrompt('');
   const saved=await db.from('office_agent_runs').insert({
    owner_id:session.user.id,agent:'superagente',task:(q.length<3?'Consulta curta: '+q:q).slice(0,300),mode:'manual',status:'review',
    result:{answer,userPrompt:q,review:payload.review||null,engine:payload.model},sources:(payload.review?.source_status||[]).map(x=>({source:x})),
    external_actions:0
   });
   setNotice(saved.error?'Resposta concluída, mas o histórico não foi salvo: '+saved.error.message:
    (payload.notice||'Resposta registrada; nenhuma ação externa foi executada.'));
   if(!saved.error)await load();
  }catch(e){setNotice(e.message)}finally{setBusy(false);setModelProgress('')}
 }
 const activeTab=tab==='nova'?null:tab;
 return <main className="office-ai-console" aria-label="BLACKHOLE · Superagente jurídico">
  <aside className={'office-ai-rail '+(expanded?'expanded':'')} aria-label="Ferramentas do agente">
   <div className="office-ai-rail-brand">
    <span className="office-ai-infinity" aria-hidden="true">∞</span>
    <button type="button" title="Expandir/recolher painel" onClick={()=>setExpanded(x=>!x)} aria-label={expanded?'Recolher painel do agente':'Expandir painel do agente'}>{expanded?<PanelLeftClose size={18}/>:<PanelLeftOpen size={18}/>}</button>
   </div>
   <nav>{tabs.map(t=>{const Icon=t.icon;return <button key={t.id} type="button" className={tab===t.id?'selected':''} title={t.title} aria-label={t.title} onClick={()=>t.id==='nova'?newChat():setTab(t.id)}><Icon size={18}/>{expanded&&<span>{t.title}</span>}</button>})}</nav>
   <div className="office-ai-rail-bottom"><Link href="/processos" title="Casos do escritório" aria-label="Processos"><BriefcaseBusiness size={17}/>{expanded&&<span>Processos</span>}</Link><Link href="/integracoes" title="Integrações" aria-label="Integrações"><PlugZap size={17}/>{expanded&&<span>Integrações</span>}</Link></div>
  </aside>
  <div className="office-ai-main">
   <header className="office-ai-header"><div><small>BLACKHOLE · INTELIGÊNCIA JURÍDICA</small><strong>Assistente jurídico</strong></div>
    <span className="office-ai-engine"><span/> {engine==='qwen'?'Qwen 0.5B · modelo local WebGPU':engine==='online'?'IA gratuita online · requer autorização':'Motor de evidências · sem custo de tokens'}</span></header>
   {activeTab?<div className="office-ai-content">
    {tab==='historico'&&<><h1>Buscar conversas</h1><p>Atividades que foram efetivamente registradas na carteira privada.</p>
     <input className="inf-search" aria-label="Pesquisar no histórico" placeholder="Buscar pedido" value={search} onChange={e=>setSearch(e.target.value)}/>
     <div className="office-ai-history">{history.filter(x=>x.task.toLowerCase().includes(search.toLowerCase())).map(r=><button type="button" key={r.id} onClick={()=>openHistory(r)}><strong>{r.task}</strong><small>{new Date(r.created_at).toLocaleDateString('pt-BR')} · {r.status}</small></button>)}
      {!history.length&&<p>Nenhuma conversa registrada.</p>}</div></>}
    {tab==='habilidades'&&<><h1>Habilidades e mini agentes</h1><p>Cada especialista encaminha seu pedido ao motor de análise verificável. Nenhuma ação é executada sem autorização.</p>
      <div className="office-agent-grid">{OFFICE_AGENTS.map(x=><button className="office-agent-card" type="button" key={x.id} onClick={()=>chooseAction('Analise a carteira como especialista de '+x.name+'. Objetivo: '+x.role+'. Aponte somente o que estiver comprovado nos registros disponíveis.')}>
       <strong>{x.name}</strong><p>{x.role}</p><small>{x.mode}</small></button>)}</div></>}
    {tab==='modelos'&&<><h1>Motores de IA disponíveis</h1><p>O mecanismo local rápido não baixa modelos. O Qwen exige WebGPU e autorização do download. A IA gratuita online só recebe mensagens após autorização explícita.</p>
      <div className="office-ai-model-choice"><button type="button" onClick={()=>{setEngine('evidencias');setTab('nova')}} aria-pressed={engine==='evidencias'}><ShieldCheck size={18}/> Motor de evidências · imediato</button>
       <button type="button" onClick={()=>{setEngine('qwen');setTab('nova')}} aria-pressed={engine==='qwen'}><Bot size={18}/> Qwen 0.5B · no navegador (WebGPU)</button>
       <button type="button" onClick={()=>{setEngine('online');setTab('nova')}} aria-pressed={engine==='online'}><Layers3 size={18}/> IA online gratuita · OpenRouter</button>
       <p>O modelo Qwen não será carregado automaticamente nem rodará na CPU se não existir GPU compatível. A primeira carga baixa centenas de megabytes de pesos.</p>
       <Link className="inf-btn" href="/pecas">Abrir elaboração de peças</Link></div></>}
    {tab==='conectores'&&<><h1>Conectores</h1><p>Fontes oficiais DataJud e DJEN, WhatsApp Cloud API e conector público Infinitum autorizado.</p>
      <div className="office-ai-links"><Link className="inf-btn" href="/integracoes">Integrações externas</Link><Link className="inf-btn" href="/processos">Consultas judiciais</Link><Link className="inf-btn" href="/whatsapp">WhatsApp</Link></div></>}
   </div>:
   <div className={'office-ai-content '+(!messages.length?'office-ai-empty':'')}>
    {!messages.length?<div className="office-ai-welcome">
      <span className="office-ai-orbit"><Bot size={24}/></span>
      <h1>O que você quer conversar ou analisar?</h1><p>Um assistente jurídico baseado nas informações autorizadas do seu escritório.</p>
      <div className="office-ai-action-cards">{ACTIONS.map(a=>{const Icon=a.icon;return <button key={a.label} type="button" onClick={()=>chooseAction(a.prompt)}><Icon size={19}/><span>{a.label}</span></button>})}</div>
     </div>:
     <div className="office-ai-messages" role="log" aria-live="polite">{messages.map((m,i)=><article key={i} className={'office-ai-message '+m.role}>
      <div className="office-ai-author">{m.role==='user'?'Você':'Superagente · evidências'}</div><div className="office-ai-message-body">{m.content}</div>
      {m.role==='assistant'&&<div className="office-ai-message-tools"><button type="button" onClick={()=>navigator.clipboard?.writeText(m.content)}><Copy size={13}/> Copiar</button><span>Revisão humana necessária · nenhuma ação executada</span></div>}
     </article>)}</div>}
   </div>}
   <div className="office-ai-bottom">
    {notice&&<p className="office-ai-notice" role="status">{notice}</p>}
    <form onSubmit={ask} className="office-ai-composer"><textarea required minLength={1} maxLength={3500} rows={2} value={prompt}
      onChange={e=>setPrompt(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask()}}}
      placeholder="Envie uma mensagem, uma tarefa ou um número CNJ..."/>
      <div className="office-ai-composer-foot"><span><ShieldCheck size={13}/> {engine==='qwen'?'Qwen 0.5B · WebGPU':engine==='online'?'IA online · somente com autorização':'Motor de evidências gratuito'}</span><button type="submit" disabled={busy||!prompt.trim()||(engine==='online'&&!externalAiConsent)||(engine==='qwen'&&!qwenConsent)}><Send size={15}/>{busy?'Analisando...':'Analisar'}</button></div>
    </form>
    <div className="blackhole-chat-models" role="group" aria-label="Selecionar o motor da conversa">
      <button type="button" aria-pressed={engine==='evidencias'} onClick={()=>setEngine('evidencias')}>Respostas rápidas</button>
      <button type="button" aria-pressed={engine==='online'} onClick={()=>setEngine('online')}>IA gratuita online</button>
      <button type="button" aria-pressed={engine==='qwen'} onClick={()=>setEngine('qwen')}>Qwen 0.5B local</button>
    </div>
    {engine==='online'&&<label className="office-ai-consent"><input type="checkbox" checked={externalAiConsent} onChange={e=>setExternalAiConsent(e.target.checked)}/> Autorizo o envio desta conversa ao modelo online gratuito (pode haver limites e tratamento pelo provedor).</label>}
    {engine==='qwen'&&<label className="office-ai-consent"><input type="checkbox" checked={qwenConsent} onChange={e=>setQwenConsent(e.target.checked)}/> Autorizo baixar os pesos do Qwen para este navegador. Exige WebGPU e memória suficiente; sem fallback CPU.</label>}
    {modelProgress&&<p className="office-ai-progress" role="status">{modelProgress}</p>}
    <p className="office-ai-disclaimer">BLACKHOLE pode errar. Confirme informações judiciais na fonte oficial antes de agir.</p>
   </div>
  </div>
 </main>;
}
export default function SuperAgentPage(){return <SecuredWorkspace active="Superagente">{({db,session})=><Console db={db} session={session}/>}</SecuredWorkspace>}
