'use client';
import {useEffect,useRef,useState} from 'react';
import {ClipboardList,LayoutDashboard,Users,CheckCircle2,Landmark,LogOut,KeyRound,NotebookPen,Bell,Mail,BarChart3,PanelLeftOpen,PanelLeftClose} from 'lucide-react';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';

const icons={'Visão geral':LayoutDashboard,'Tarefas':ClipboardList,'Clientes':Users,'Finalizados':CheckCircle2,'Instituições':Landmark,'Minhas atividades':NotebookPen,'Relatórios':BarChart3};
export default function CrmShell({active='Visão geral',email='',onNavigate,onSignOut,onPassword,overdueCount=0,children}){
 const [sidebarExpanded,setSidebarExpanded]=useState(false);
 const sidebarRef=useRef(null);
 useEffect(()=>{
  function onPointerDown(event){
   if(!sidebarRef.current?.contains(event.target))setSidebarExpanded(false);
  }
  function onKeyDown(event){
   if(event.key==='Escape')setSidebarExpanded(false);
  }
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('keydown',onKeyDown);
  return()=>{
   document.removeEventListener('pointerdown',onPointerDown,true);
   document.removeEventListener('keydown',onKeyDown);
  };
 },[]);
 const shrinkIfUnfocused=()=>{
  if(!sidebarRef.current?.contains(document.activeElement))setSidebarExpanded(false);
 };
 return <div className={'app-shell '+(sidebarExpanded?'sidebar-expanded':'sidebar-collapsed')}>
  <aside ref={sidebarRef} className="app-sidebar"
    onMouseEnter={()=>setSidebarExpanded(true)}
    onMouseLeave={shrinkIfUnfocused}
    onFocusCapture={()=>setSidebarExpanded(true)}
    onBlurCapture={event=>{
     if(!event.currentTarget.contains(event.relatedTarget))setSidebarExpanded(false);
    }}>
   <div className="app-identity">
    <button type="button" className="app-sidebar-toggle" aria-label={sidebarExpanded?'Recolher menu lateral':'Expandir menu lateral'} aria-expanded={sidebarExpanded} onClick={()=>setSidebarExpanded(x=>!x)}>{sidebarExpanded?<PanelLeftClose size={19}/>:<PanelLeftOpen size={19}/>}</button>
    <svg className="app-brand-monogram" viewBox="0 0 92 52" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M8 10h21l12 27 7-16-5-11h14l10 27 12-27h9L68 49H58L47 28 36 49H27L8 10z" fill="none" stroke="#efd7df" strokeWidth="3.2" strokeLinejoin="miter"/><path d="M24 10h18m17 0h19" stroke="#efd7df" strokeWidth="2.2"/></svg>
    <strong>PROJECT<span>W1SC</span></strong><small>NEGOCIAÇÕES · CRM</small>
   </div>
   <div className="app-mobile-account">
    {onPassword?<button type="button" onClick={onPassword} aria-label="Alterar senha"><KeyRound size={16}/></button>:<a href="/?senha=1" aria-label="Alterar senha"><KeyRound size={16}/></a>}
    <button type="button" onClick={onSignOut} aria-label="Sair da conta"><LogOut size={16}/></button>
   </div>
   <div className="app-section-name">ÁREA DE TRABALHO</div>
   <nav aria-label="Navegação principal" className="app-nav">
    {CRM_AREAS.map(item=>{
     const Icon=icons[item.label];
     return <a key={item.key} href={item.path} aria-current={active===item.label?'page':undefined} className={'app-nav-link '+(active===item.label?'active':'')} title={sidebarExpanded?undefined:item.label} aria-label={item.label} onClick={e=>{
       if(onNavigate&&!['Tarefas','Minhas atividades','Relatórios'].includes(item.label)&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
        e.preventDefault();onNavigate(item.label);setSidebarExpanded(false);
       }
      }}><Icon size={17} aria-hidden="true"/><span>{item.label}</span></a>;
    })}
   </nav>
   <footer className="app-nav-footer">
    <div className="app-private"><span>Dados privados, rastreáveis e<br/>vinculados à origem.</span></div>
    <small title={email} className="app-account-email"><Mail size={14}/>{email}</small>
    <div className="app-account-actions">
     {onPassword?<button onClick={onPassword} type="button"><KeyRound size={14}/> Alterar senha</button>:<a href="/?senha=1"><KeyRound size={14}/> Alterar senha</a>}
     <button onClick={onSignOut} type="button"><LogOut size={14}/> Sair</button>
    </div>
   </footer>
  </aside>
  <div className="app-content"><div className="reference-top-tools"><a href="/tarefas?fila=vencidos" aria-label="Ver retornos vencidos" title="Ver retornos vencidos" className="reference-top-alert"><Bell size={20}/>{overdueCount>0&&<span className="reference-notification-dot"/>}</a><span className="reference-top-divider"/><span className="reference-top-avatar" title={email}>W</span></div>{children}</div>
 </div>;
}
