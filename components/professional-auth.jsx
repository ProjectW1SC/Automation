'use client';
import {useEffect,useRef} from 'react';
import {ArrowRight,ShieldCheck} from 'lucide-react';

// O painel animado utiliza o vídeo fornecido pelo cliente; o formulário é HTML real, separado.
export default function ProfessionalAuth({eyebrow='GESTÃO JURÍDICA',title='Bem-vindo de volta',description='Entre na sua conta para continuar.',onSignup=null,signupMode=false,children}){
 const videoRef=useRef(null);
 useEffect(()=>{
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const el=videoRef.current;
  const sync=()=>{
   if(!el)return;
   if(media?.matches){el.pause();return}
   const task=el.play();
   if(task?.catch)task.catch(()=>{});
  };
  sync();
  media?.addEventListener?.('change',sync);
  return()=>{media?.removeEventListener?.('change',sync);el?.pause()};
 },[]);
 return <main className="w1-auth-screen" data-office-login="infinitum-reference">
  <div className="w1-auth-frame">
   <section className="w1-auth-hero" aria-label="Infinitum — gestão jurídica com método e alta performance">
    <div className="w1-auth-video-poster" aria-hidden="true"/>
    <video ref={videoRef} className="w1-auth-video" autoPlay muted loop playsInline preload="metadata"
      poster="/branding/infinitum-login-poster.webp?v=20261113-galaxy" aria-hidden="true"
      onError={event=>{event.currentTarget.style.display='none'}}>
     <source src="/branding/infinitum-login-hero.mp4?v=20261113-galaxy" type="video/mp4"/>
    </video>
    <div className="w1-auth-hero-transcript">
     <span>∞ INFINITUM | CRM JURÍDICO</span>
     <h2>Gestão jurídica com método, inteligência e alta performance.</h2>
     <p>Organize processos, clientes, prazos, compromissos e sua operação jurídica em um só lugar.</p>
    </div>
   </section>
   <section className="w1-auth-panel" aria-label="Acesso ao INFINITUM">
    <div className="w1-auth-panel-top">
     <a className="w1-auth-mark" href="/" title="INFINITUM — Gestão jurídica" aria-label="INFINITUM">
      <img src="/branding/infinitum-symbol-preto.svg" width="32" height="24" alt=""/> <span>INFINITUM</span>
     </a>
     {onSignup&&<button type="button" className="w1-auth-create" onClick={onSignup}>{signupMode?'Fazer login':'Criar conta'} <ArrowRight size={14}/></button>}
    </div>
    <div className="w1-auth-panel-center">
     <div className="w1-auth-heading"><span className="w1-auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
     {children}
    </div>
    <div className="w1-auth-panel-footer"><ShieldCheck size={14}/> INFINITUM · Acesso seguro para membros autorizados</div>
   </section>
  </div>
 </main>
}
