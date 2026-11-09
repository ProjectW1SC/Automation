'use client';
import {ClipboardList,LayoutDashboard,Users,CheckCircle2,Landmark,LogOut,KeyRound} from 'lucide-react';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';

const icons={'Visão geral':LayoutDashboard,'Tarefas':ClipboardList,'Clientes':Users,'Finalizados':CheckCircle2,'Instituições':Landmark};
export default function CrmShell({active='Visão geral',email='',onNavigate,onSignOut,onPassword,children}){
 return <div className="app-shell">
  <aside className="app-sidebar">
   <div className="app-identity"><strong>PROJECT<span>W1SC</span></strong><small>NEGOCIAÇÕES · CRM</small></div>
   <div className="app-mobile-account">
    {onPassword?<button type="button" onClick={onPassword} aria-label="Alterar senha"><KeyRound size={16}/></button>:<a href="/?senha=1" aria-label="Alterar senha"><KeyRound size={16}/></a>}
    <button type="button" onClick={onSignOut} aria-label="Sair da conta"><LogOut size={16}/></button>
   </div>
   <div className="app-section-name">ÁREA DE TRABALHO</div>
   <nav aria-label="Navegação principal" className="app-nav">
    {CRM_AREAS.map(item=>{
     const Icon=icons[item.label];
     return <a key={item.key} href={item.path} aria-current={active===item.label?'page':undefined} className={'app-nav-link '+(active===item.label?'active':'')} onClick={e=>{
       if(onNavigate&&item.label!=='Tarefas'&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
        e.preventDefault();onNavigate(item.label);
       }
      }}><Icon size={17} aria-hidden="true"/><span>{item.label}</span></a>;
    })}
   </nav>
   <footer className="app-nav-footer">
    <div className="app-private"><span className="app-indicator"/> Área restrita</div>
    <small title={email}>{email}</small>
    <div className="app-account-actions">
     {onPassword?<button onClick={onPassword} type="button"><KeyRound size={14}/> Alterar senha</button>:<a href="/?senha=1"><KeyRound size={14}/> Alterar senha</a>}
     <button onClick={onSignOut} type="button"><LogOut size={14}/> Sair</button>
    </div>
   </footer>
  </aside>
  <div className="app-content">{children}</div>
 </div>;
}
