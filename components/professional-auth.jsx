'use client';
import {useState} from 'react';
import {ArrowRight,ShieldCheck,Workflow,CalendarDays,MessageSquare} from 'lucide-react';

// Reconstrução independente da composição enviada: card preto marmorizado + formulário branco.
// A identidade, marcas e permissões continuam próprias do ProjectW1SC.
export default function ProfessionalAuth({eyebrow='GESTÃO JURÍDICA',title='Bem-vindo de volta',description='Entre na sua conta para continuar.',onSignup=null,signupMode=false,children}){
 return <main className="w1-auth-screen" data-office-login="infinitum-reference">
  <div className="w1-auth-frame">
   <section className="w1-auth-hero" aria-label="Inteligência jurídica BLACKHOLE">
    <div className="w1-auth-hero-top">
     <span className="w1-auth-hero-kicker">GESTÃO INTELIGENTE</span>
     <h2>Entre no horizonte<br/><em>da inteligência jurídica.</em></h2>
     <div className="w1-auth-benefits">
      <div><span><Workflow size={17}/></span><strong>Carteira organizada</strong><small>Clientes, processos e tarefas em um só fluxo.</small></div>
      <div><span><CalendarDays size={17}/></span><strong>Agenda operacional</strong><small>Prazos, audiências e retornos em visão única.</small></div>
      <div><span><MessageSquare size={17}/></span><strong>Atendimento integrado</strong><small>Conversas e histórico ligados ao cadastro.</small></div>
     </div>
    </div>
    <div className="w1-auth-hero-footer">
     <p>Tudo em uma só plataforma</p>
     <div className="w1-auth-hero-tags" aria-label="Funcionalidades integradas">
      {['Processos','WhatsApp','Análises','Prazos','Atividades','IA'].map(label=><span key={label}>{label}</span>)}
     </div>
    </div>
   </section>
   <section className="w1-auth-panel" aria-label="Entrar no ProjectW1SC">
    <div className="w1-auth-panel-top">
     <a className="w1-auth-mark" href="/" title="BLACKHOLE — Gestão jurídica" aria-label="BLACKHOLE">
      <img src="/branding/blackhole-symbol.svg" width="60" height="42" alt="BLACKHOLE"/> <svg viewBox="0 0 80 42" role="img" aria-label="Marca do BLACKHOLE" style={{display:"none"}}>
       <path d="M40 21c-6.7-11.1-12.5-16.8-21-16.8C9.3 4.2 3 11.7 3 21s6.3 16.8 16 16.8c8.5 0 14.3-5.7 21-16.8 6.7-11.1 12.5-16.8 21-16.8 9.7 0 16 7.5 16 16.8s-6.3 16.8-16 16.8c-8.5 0-14.3-5.7-21-16.8Z" fill="none" stroke="currentColor" strokeWidth="3.7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
     </a>
     {onSignup&&<button type="button" className="w1-auth-create" onClick={onSignup}>{signupMode?'Fazer login':'Criar conta'} <ArrowRight size={14}/></button>}
    </div>
    <div className="w1-auth-panel-center">
     <div className="w1-auth-heading"><span className="w1-auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
     {children}
    </div>
    <div className="w1-auth-panel-footer"><ShieldCheck size={14}/> BLACKHOLE · Acesso exclusivo a membros autorizados</div>
   </section>
  </div>
 </main>
}
