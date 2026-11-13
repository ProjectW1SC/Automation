'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ClipboardList,LayoutDashboard,Users,CheckCircle2,Landmark,LogOut,KeyRound,NotebookPen,Bell,Mail,BarChart3,PanelLeftOpen,PanelLeftClose,Palette,Settings2,Gavel,CalendarDays,Scale,Target,Bot,Radar,FileText,MessageSquare,Clock3,BriefcaseBusiness,BookOpen,UserRoundCheck,Workflow,PlugZap,ScanSearch,Search,Command,Menu,X} from 'lucide-react';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
import {getClient} from '../lib/supabase-client';

import {applyAppearanceToDocument} from '../lib/appearance-settings.mjs';

function preferredTheme(){try{return resolveTheme(localStorage.getItem('projectw1sc.crm-theme'));}catch{return 'infinitum';}}
const displayLabels={ 'Painel jurídico':'Dashboard','WhatsApp':'Comunicação','Peças e petições':'Documentos','Fluxos (POP)':'Procedimentos','Mini Agentes':'Agentes','Scanner judicial':'Scanner judicial' };
const icons={
 'Painel jurídico':BriefcaseBusiness,'Clientes':Users,'Processos':Gavel,'Scanner judicial':ScanSearch,
 'Prazos':Clock3,'Fluxos (POP)':Workflow,'Audiências':CalendarDays,'Agenda':CalendarDays,'Peças e petições':FileText,
 'WhatsApp':MessageSquare,'Leads':Target,'Gerador de processos':Radar,
 'Superagente':Bot,'Mini Agentes':UserRoundCheck,'Relatórios':BarChart3,
 'Integrações':PlugZap,'Configurações':Settings2
};
export default function CrmShell({active='Painel jurídico',email='',onNavigate,onSignOut,onPassword,overdueCount=0,children}){
 const [sidebarExpanded,setSidebarExpanded]=useState(false);
 const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
 useEffect(()=>{if(window.innerWidth<880)setSidebarExpanded(false)},[]);
 const [navSearch,setNavSearch]=useState('');
 const navSearchRef=useRef(null);
 const matches=navSearch.trim()?CRM_AREAS.filter(x=>x.label.toLocaleLowerCase('pt-BR').includes(navSearch.trim().toLocaleLowerCase('pt-BR'))).slice(0,6):[];
 const [theme,setTheme]=useState('infinitum');
 const [profile,setProfile]=useState({display_name:'',avatar_path:''});
 const [avatarUrl,setAvatarUrl]=useState('');
 const appearanceRef=useRef({colors:{},backgroundUrl:''});
 useEffect(()=>{
  const db=getClient();if(!db)return;
  let alive=true;
  let request=0,previousPhotoUrl='',previousBackgroundUrl='',refreshTimer=null;
  async function refreshProfile(){
   const current=++request;
   const {data,error}=await db.auth.getUser();
   if(!alive||current!==request||error||!data?.user)return;
   const user=data.user,metadata=user.user_metadata||{};
   setProfile({display_name:String(metadata.display_name||metadata.full_name||''),avatar_path:String(metadata.avatar_path||'')});
   const {data:{session}}=await db.auth.getSession();
   const headers=session?.access_token?{Authorization:'Bearer '+session.access_token}:{};
   const [photo,background]=await Promise.all([
    metadata.avatar_path?fetch('/api/profile/media?type=avatar',{headers,cache:'no-store'}):Promise.resolve(null),
    Promise.resolve(null)
   ]);
   if(!alive||current!==request)return;
   const [photoUrl,backgroundUrl]=await Promise.all([photo?.ok?photo.blob().then(URL.createObjectURL):Promise.resolve(''),background?.ok?background.blob().then(URL.createObjectURL):Promise.resolve('')]);
   if(!alive||current!==request){if(photoUrl)URL.revokeObjectURL(photoUrl);if(backgroundUrl)URL.revokeObjectURL(backgroundUrl);return}
   if(previousPhotoUrl)URL.revokeObjectURL(previousPhotoUrl);if(previousBackgroundUrl)URL.revokeObjectURL(previousBackgroundUrl);
   previousPhotoUrl=photoUrl;previousBackgroundUrl=backgroundUrl;setAvatarUrl(photoUrl);
   const savedTheme=preferredTheme();
   appearanceRef.current={colors:{},backgroundUrl:''};
   document.documentElement.dataset.crmTheme=savedTheme;
   applyAppearanceToDocument(document.documentElement,CRM_THEMES.find(t=>t.id===savedTheme),{},'');
   setTheme(savedTheme);
  }
  function scheduleRefresh(){if(refreshTimer)window.clearTimeout(refreshTimer);refreshTimer=window.setTimeout(refreshProfile,0)}
  const {data:{subscription}}=db.auth.onAuthStateChange(()=>{scheduleRefresh()});
  window.addEventListener('projectw1sc:profile-change',scheduleRefresh);
  window.addEventListener('projectw1sc:appearance-change',scheduleRefresh);
  refreshProfile();
  return()=>{alive=false;if(refreshTimer)window.clearTimeout(refreshTimer);if(previousPhotoUrl)URL.revokeObjectURL(previousPhotoUrl);if(previousBackgroundUrl)URL.revokeObjectURL(previousBackgroundUrl);subscription.unsubscribe();window.removeEventListener('projectw1sc:profile-change',scheduleRefresh);window.removeEventListener('projectw1sc:appearance-change',scheduleRefresh)};
 },[]);
  const sidebarRef=useRef(null);
 // O tema é uma preferência real; navegação e refresh não devem redefini-lo.
 useEffect(()=>{
  function syncTheme(){
   const selected=preferredTheme();
   document.documentElement.dataset.crmTheme=selected;
   applyAppearanceToDocument(document.documentElement,CRM_THEMES.find(t=>t.id===selected),{},'');
   setTheme(selected);
  }
  window.addEventListener('projectw1sc:theme-change',syncTheme);
  syncTheme();
  return()=>window.removeEventListener('projectw1sc:theme-change',syncTheme);
 },[]);
 useEffect(()=>{
  function onPointerDown(event){
   if(!sidebarRef.current?.contains(event.target))setSidebarExpanded(false);
  }
  function onKeyDown(event){
   if(event.key==='Escape')setSidebarExpanded(false);
  }
  function onCommandKey(event){
   if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();navSearchRef.current?.focus();
   }
   if(event.key==='Escape')setNavSearch('');
  }
  document.addEventListener('keydown',onCommandKey);
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('keydown',onKeyDown);
  return()=>{
   document.removeEventListener('keydown',onCommandKey);
   document.removeEventListener('pointerdown',onPointerDown,true);
   document.removeEventListener('keydown',onKeyDown);
  };
 },[]);
 const shrinkIfUnfocused=()=>{
  if(!sidebarRef.current?.contains(document.activeElement))setSidebarExpanded(false);
 };
 function selectTheme(value){
  const selected=resolveTheme(value);
  try{localStorage.setItem('projectw1sc.crm-theme',selected)}catch{}
  document.documentElement.dataset.crmTheme=selected;
  applyAppearanceToDocument(document.documentElement,CRM_THEMES.find(t=>t.id===selected),{},'');
  setTheme(selected);
  window.dispatchEvent(new Event('projectw1sc:theme-change'));
 }
 return <div className={'app-shell blackhole-studio-shell '+(sidebarExpanded?'sidebar-expanded':'sidebar-collapsed')}>
  <aside ref={sidebarRef} className="app-sidebar"
    onMouseEnter={()=>setSidebarExpanded(true)}
    onMouseLeave={shrinkIfUnfocused}
    onFocusCapture={()=>setSidebarExpanded(true)}
    onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setSidebarExpanded(false)}}>
   <div className="app-identity"><Link href="/" className="pr-brand" aria-label="INFINITUM — Painel jurídico"><span className="pr-brand-symbol" aria-hidden="true">∞</span><strong className="pr-brand-name">INFINITUM</strong><small className="pr-brand-sub">CRM | JURÍDICO</small></Link>
    <button type="button" className="app-sidebar-toggle" aria-label={sidebarExpanded?'Recolher menu lateral':'Expandir menu lateral'} aria-expanded={sidebarExpanded} onClick={()=>setSidebarExpanded(x=>!x)}>{sidebarExpanded?<PanelLeftClose size={19}/>:<PanelLeftOpen size={19}/>}</button>
    <Link className="app-brand-link" href="/" aria-label="BLACKHOLE — Painel jurídico" title="Ir ao painel jurídico" prefetch={false}>
     <img className="app-brand-compact" src="/branding/blackhole-symbol.svg" alt="" width="54" height="58"/>
     <img className="app-brand-full" src="/branding/blackhole-logo.svg" alt="" width="202" height="65"/>
    </Link>
   </div>
   <div className="app-mobile-account">
    {onPassword?<button type="button" onClick={onPassword} aria-label="Alterar senha"><KeyRound size={16}/></button>:<a href="/?senha=1" aria-label="Alterar senha"><KeyRound size={16}/></a>}
    <button type="button" onClick={onSignOut} aria-label="Sair da conta"><LogOut size={16}/></button>
   </div>
   <div className="app-section-name">ESPAÇO DE TRABALHO</div>
   <nav aria-label="Navegação principal" className="app-nav">
    {CRM_AREAS.map(item=>{
     const Icon=icons[item.label];
     return <Link key={item.key} href={item.path} prefetch={false} aria-current={active===item.label?'page':undefined} className={'app-nav-link '+(active===item.label?'active':'')} title={sidebarExpanded?undefined:item.label} aria-label={item.label} onClick={e=>{
       if(onNavigate&&!['Clientes','Processos','Scanner judicial','Prazos','Fluxos (POP)','Audiências','Agenda','Peças e petições','WhatsApp','Leads','Superagente','Mini Agentes','Gerador de processos','Relatórios','Integrações','Configurações'].includes(item.label)&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
        e.preventDefault();onNavigate(item.label);setSidebarExpanded(false);
       }
      }} ><Icon size={17} aria-hidden="true"/><span>{displayLabels[item.label]||item.label}</span></Link>;
    })}
   </nav>
   <footer className="app-nav-footer">
    <div className="app-private"><span>Operação privada com trilha de auditoria.</span></div>
    <small className="app-account-email" title={email}><Mail size={14}/><span><strong className="app-profile-label">{profile.display_name||'Meu perfil'}</strong>{email}</span></small>
    <div className="app-account-actions">
     {onPassword?<button onClick={onPassword} type="button"><KeyRound size={14}/> Alterar senha</button>:<a href="/?senha=1"><KeyRound size={14}/> Alterar senha</a>}
     <button onClick={onSignOut} type="button"><LogOut size={14}/> Sair</button>
    </div>
    <small className="app-copyright" aria-label="Direitos autorais da W1 Capital">© 2026 BLACKHOLE · W1 Capital</small>
   </footer>
  </aside>
  <div className="app-content"><div className="reference-top-tools">
   <div className="blackhole-shell-breadcrumb"><img src="/branding/blackhole-symbol.svg" alt="" width="31" height="20"/><Link href="/" prefetch={false}>PROJECTW1SC</Link><span className="blackhole-shell-crumb-sep">/</span><strong>{active}</strong></div>
   <div className="blackhole-shell-tools">
    <div className="blackhole-shell-search"><Search size={15}/><input ref={navSearchRef} type="search" value={navSearch} onChange={e=>setNavSearch(e.target.value)} aria-label="Pesquisar abas do escritório" placeholder="Buscar uma área..."/><kbd><Command size={12}/> K</kbd>
     {!!navSearch.trim()&&<div className="blackhole-shell-search-results" role="listbox">{matches.length?matches.map(x=><Link key={x.key} href={x.path} prefetch={false} onClick={()=>setNavSearch('')}>{x.label}</Link>):<span>Nenhuma área encontrada.</span>}</div>}
    </div>
   <label className="crm-theme-picker crm-theme-select"><Palette size={14} aria-hidden="true"/><span>Tema</span><select aria-label="Escolher tema visual" value={theme} onChange={e=>selectTheme(e.target.value)}>{CRM_THEMES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
   <span className="bh-theme-identity" title="BLACKHOLE · horizonte de eventos"><img src="/branding/blackhole-symbol.svg" alt="" width="29" height="19"/> BLACKHOLE</span>
   <button type="button" className="crm-visible-signout" onClick={onSignOut} title="Sair da conta" aria-label="Sair da conta"><LogOut size={18}/><span>Sair</span></button><Link href="/prazos?status=vencidos" prefetch={false} aria-label="Ver retornos vencidos" title="Ver retornos vencidos" className="reference-top-alert"><Bell size={20}/>{overdueCount>0&&<span className="reference-notification-dot"/>}</Link><span className="reference-top-divider"/><Link className="reference-top-avatar" href="/configuracoes" prefetch={false} title={profile.display_name||'Configurações do perfil'} aria-label="Abrir configurações do perfil">{avatarUrl?<img src={avatarUrl} alt="Foto do perfil"/>:(profile.display_name||email||'W').charAt(0).toLocaleUpperCase('pt-BR')}</Link></div></div>{children}{mobileMenuOpen&&<div className="crm-mobile-more" role="dialog" aria-label="Todas as áreas do CRM"><header><strong>Todas as áreas</strong><button type="button" onClick={()=>setMobileMenuOpen(false)} aria-label="Fechar menu"><X size={19}/></button></header><div className="crm-mobile-more-links">{CRM_AREAS.map(item=>{const Icon=icons[item.label];return <Link href={item.path} key={item.key} prefetch={false} onClick={()=>setMobileMenuOpen(false)}><Icon size={17}/>{displayLabels[item.label]||item.label}</Link>})}</div><label>Visual e temas<select aria-label="Selecionar tema no celular" value={theme} onChange={e=>selectTheme(e.target.value)}>{CRM_THEMES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label><button type="button" className="crm-more-signout" onClick={onSignOut}><LogOut size={16}/> Sair da conta</button></div>}
   <nav className="crm-mobile-dock" aria-label="Navegação móvel">{[{href:'/',Icon:LayoutDashboard,name:'Início'},{href:'/clientes',Icon:Users,name:'Clientes'},{href:'/processos',Icon:Scale,name:'Processos'},{href:'/agenda',Icon:CalendarDays,name:'Agenda'},{href:'/whatsapp',Icon:MessageSquare,name:'Mensagens'}].map(({href,Icon,name})=><Link key={href} href={href} prefetch={false} title={name} aria-label={name}><Icon size={18}/><span>{name}</span></Link>)}<button type="button" aria-label="Todas as áreas" aria-expanded={mobileMenuOpen} onClick={()=>setMobileMenuOpen(x=>!x)}>{mobileMenuOpen?<X size={18}/>:<Menu size={18}/>}<span>Mais</span></button></nav></div>
 </div>;
}
