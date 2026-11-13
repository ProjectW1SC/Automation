'use client';
import {useEffect,useRef} from 'react';
import {ArrowRight,ShieldCheck} from 'lucide-react';

// O painel animado utiliza o vídeo fornecido pelo cliente; o formulário é HTML real, separado.
export default function ProfessionalAuth({eyebrow='GESTÃO JURÍDICA',title='Bem-vindo de volta',description='Entre na sua conta para continuar.',onSignup=null,signupMode=false,children}){
 const videoRef=useRef(null);
 useEffect(()=>{
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const sync=()=>{
   const el=videoRef.current;
   if(!el)return;
   if(media?.matches){el.pause();return}
   const task=el.play();
   if(task?.catch)task.catch(()=>{});
  };
  sync();
  media?.addEventListener?.('change',sync);
  return()=>{media?.removeEventListener?.('change',sync);videoRef.current?.pause()};
 },[]);
 return <main className="w1-auth-screen" data-office-login="infinitum-reference">
  <div className="w1-auth-frame">
   <section className="w1-auth-hero" aria-label="Infinitum — gestão jurídica com método e alta performance">
    <div className="w1-auth-video-poster" aria-hidden="true"/>
    <video ref={videoRef} className="w1-auth-video" autoPlay muted loop playsInline preload="metadata"
      poster="/branding/infinitum-login-poster.webp" aria-hidden="true"
      onError={event=>{event.currentTarget.style.display='none'}}>
     <source src="/branding/infinitum-login-hero.mp4" type="video/mp4"/>
    </video>
    <div className="w1-auth-hero-transcript">
     <span>∞ INFINITUM | CRM JURÍDICO</span>
     <h2>Gestão jurídica com método, inteligência e alta performance.</h2>
     <p>Organize processos, clientes, prazos, compromissos e sua operação jurídica em um só lugar.</p>
    </div>
   </section>
   <section className="w1-auth-panel" aria-label="Entrar no ProjectW1SC">
    <div className="w1-auth-panel-top">
     <a className="w1-auth-mark" href="/" title="BLACKHOLE — Gestão jurídica" aria-label="BLACKHOLE">
      <img src="/branding/projectw1sc-symbol.svg" width="60" height="42" alt="BLACKHOLE"/> <svg viewBox="0 0 80 42" role="img" aria-label="Marca do BLACKHOLE" style={{display:"none"}}>
       <path d="M40 21c-6.7-11.1-12.5-16.8-21-16.8C9.3 4.2 3 11.7 3 21s6.3 16.8 16 16.8c8.5 0 14.3-5.7 21-16.8 6.7-11.1 12.5-16.8 21-16.8 9.7 0 16 7.5 16 16.8s-6.3 16.8-16 16.8c-8.5 0-14.3-5.7-21-16.8Z" fill="none" stroke="currentColor" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
     </a>
     {onSignup&&<button type="button" className="w1-auth-create" onClick={onSignup}>{signupMode?'Fazer login':'Criar conta'} <ArrowRight size={14}/></button>}
    </div>
    <div className="w1-auth-panel-center">
     <div className="w1-auth-heading"><span className="w1-auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
     {children}
    </div>
    <div className="w1-auth-panel-footer"><ShieldCheck size={14}/> PROJECTW1SC · Acesso seguro para membros autorizados</div>
   </section>
  </div>
 </main>
}
