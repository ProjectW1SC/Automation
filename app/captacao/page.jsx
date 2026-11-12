'use client';
import {useState} from 'react';
import Script from 'next/script';
import {Scale,ShieldCheck,Send,Phone,CalendarDays} from 'lucide-react';
const areas=[['civil','Direito civil'],['trabalhista','Direito do trabalho'],['familia','Família'],['consumidor','Direito do consumidor'],['previdenciario','Previdenciário'],['empresarial','Empresarial'],['outro','Outro assunto']];
export default function CaptacaoPage(){
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[done,setDone]=useState(false);
 const [form,setForm]=useState({name:'',email:'',phone:'',area:'civil',message:'',consent:false,website:''});
 async function submit(e){
  e.preventDefault();if(!siteKey)return;
  setBusy(true);setNotice('');
  try{
   const token=new FormData(e.currentTarget).get('cf-turnstile-response');
   const r=await fetch('/api/captacao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,turnstileToken:String(token||'')})});
   const p=await r.json();if(!p.ok)throw Error(p.error||'Falha ao registrar solicitação');
   setDone(true);
  }catch(e){setNotice(e.message)}finally{setBusy(false)}
 }
 return <main className="inf-studio" style={{maxWidth:1080,paddingTop:50}}>
  <header className="inf-heading"><div><small>ESCRITÓRIO DE ADVOCACIA · ATENDIMENTO</small><h1>Atendimento jurídico organizado e transparente</h1>
   <p>Solicite contato do escritório para conversar sobre seu assunto. O recebimento da mensagem não constitui contratação ou garantia de resultado.</p></div><Scale size={38} aria-hidden="true"/></header>
  <div className="office-panel-grid"><section className="inf-panel"><h2>Como funciona</h2>
   <div className="office-records">
    <article className="office-record"><strong><Phone size={16}/> 1. Solicitação</strong><p>Você informa voluntariamente seu contato e a área de interesse.</p></article>
    <article className="office-record"><strong><CalendarDays size={16}/> 2. Triagem</strong><p>O escritório analisa a disponibilidade e esclarece os próximos passos.</p></article>
    <article className="office-record"><strong><ShieldCheck size={16}/> 3. Atendimento</strong><p>O profissional responsável avalia documentos e orienta sobre a contratação.</p></article>
   </div><div className="inf-note">Não envie senhas, documentos sigilosos nem informações sensíveis neste formulário. Caso seja necessário, serão solicitados por canal protegido.</div>
   </section>
   <section className="inf-panel"><h2>Solicitar contato</h2>
    {done?<div className="inf-note">Solicitação registrada. O contato dependerá da disponibilidade do escritório, sem promessa de prazo.</div>:
    <form onSubmit={submit} className="office-form-col">
     <label>Nome<input required minLength={2} maxLength={160} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
     <label>E-mail<input type="email" maxLength={180} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
     <label>Telefone<input maxLength={25} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
     <label>Área do direito<select value={form.area} onChange={e=>setForm({...form,area:e.target.value})}>{areas.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
     <label>Resumo da solicitação (opcional)<textarea maxLength={900} value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label>
     <label style={{display:'none'}}>Site<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></label>
     <label style={{display:'flex',gap:9,alignItems:'start'}}><input type="checkbox" required checked={form.consent} style={{width:'auto',marginTop:3}} onChange={e=>setForm({...form,consent:e.target.checked})}/>
      Autorizo o uso desses dados exclusivamente para o escritório responder à minha solicitação de contato, conforme a LGPD.</label>
     {siteKey?<><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive"/><div className="cf-turnstile" data-sitekey={siteKey}/></>:<p className="inf-note">Formulário temporariamente indisponível até a configuração da verificação de segurança.</p>}
     {notice&&<div className="inf-note error" role="alert">{notice}</div>}
     <button className="inf-btn primary" disabled={!siteKey||busy||!form.consent||(!form.phone&&!form.email)}><Send size={15}/> {busy?'Enviando...':'Enviar solicitação'}</button>
    </form>}
   </section></div>
  <footer className="office-hint">Informações gerais. A análise individual do caso e qualquer serviço jurídico dependem de avaliação e contratação pelo profissional habilitado.</footer>
 </main>;
}
