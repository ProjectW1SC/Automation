'use client';
import {ShieldCheck,ChartNoAxesCombined,History,LockKeyhole} from 'lucide-react';

export default function ProfessionalAuth({eyebrow='ÁREA RESTRITA',title='Bem-vindo de volta',description='Entre com seu acesso autorizado.',children}){
 return <main className="w1-auth-screen"><div className="w1-auth-frame">
  <section className="w1-auth-hero" aria-label="Apresentação ProjectW1SC">
   <div className="w1-auth-hero-top"><img className="w1-auth-hero-logo" src="/branding/projectw1sc-wordmark.svg" alt="ProjectW1SC — Gestão jurídica" width="390" height="120"/><div className="w1-auth-hero-tag"><i/> PLATAFORMA OPERACIONAL</div></div>
   <div className="w1-auth-hero-content"><span>UM AMBIENTE. TODA A OPERAÇÃO.</span><h2>Mais clareza em cada decisão.</h2><p>Clientes, processos, prazos e atendimentos organizados para a rotina de um escritório de advocacia.</p>
    <div className="w1-auth-capabilities">
     <div><span><ChartNoAxesCombined size={19}/></span><div><strong>Visão inteligente</strong><small>Indicadores e prioridades em um só lugar</small></div></div>
     <div><span><History size={19}/></span><div><strong>Histórico organizado</strong><small>Informações e atendimentos rastreáveis</small></div></div>
     <div><span><ShieldCheck size={19}/></span><div><strong>Acesso controlado</strong><small>Autenticação e permissões no banco</small></div></div>
    </div>
   </div>
   <div className="w1-auth-hero-footer"><span>PROJECTW1SC · W1 CAPITAL</span><span>© 2026 W1 Capital</span></div>
  </section>
  <section className="w1-auth-panel" aria-label="Acesso ao sistema">
   <div className="w1-auth-panel-top"><span>PROJECTW1SC · CONSOLE OPERACIONAL</span><span className="w1-auth-lock"><LockKeyhole size={14}/> Acesso privado</span></div>
   <div className="w1-auth-panel-center"><div className="w1-auth-heading"><span className="w1-auth-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}</div>
   <div className="w1-auth-panel-footer"><ShieldCheck size={15}/> Protegido por autenticação e políticas de acesso · W1 Capital</div>
  </section>
 </div></main>;
}
