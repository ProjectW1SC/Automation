'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ClipboardList,LayoutDashboard,Users,CheckCircle2,Landmark,LogOut,KeyRound,NotebookPen,Bell,Mail,BarChart3,PanelLeftOpen,PanelLeftClose,Palette,Settings2,Gavel,CalendarDays,Scale,Target,Bot,Radar,FileText,MessageSquare,Clock3,BriefcaseBusiness,BookOpen,UserRoundCheck,Workflow,PlugZap,ScanSearch,Search,Command} from 'lucide-react';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';
import {CRM_THEMES,resolveTheme} from '../lib/crm-themes.mjs';
import {getClient} from '../lib/supabase-client';
import {PROFILE_BUCKET,ownerAvatarPath} from '../lib/profile-settings.mjs';
import {APPEARANCE_BUCKET,applyAppearanceToDocument} from '../lib/appearance-settings.mjs';

const icons={
 'Painel jurídico':BriefcaseBusiness,'Clientes':Users,'Processos':Gavel,'Scanner judicial':ScanSearch,
 'Prazos':Clock3,'Fluxos (POP)':Workflow,'Audiências':CalendarDays,'Peças e petições':FileText,
 'WhatsApp':MessageSquare,'Leads':Target,'Gerador de processos':Radar,
 'Superagente':Bot,'Mini Agentes':UserRoundCheck,'Relatórios':BarChart3,
 'Integrações':PlugZap,'Configurações':Settings2
};
export default function CrmShell({active='Painel jurídico',email='',onNavigate,onSignOut,onPassword,overdueCount=0,children}){
 const [sidebarExpanded,setSidebarExpanded]=useState(false);
 const [navSearch,setNavSearch]=useState('');
 const navSearchRef=useRef(null);
 const matches=navSearch.trim()?CRM_AREAS.filter(x=>x.label.toLocaleLowerCase('pt-BR').includes(navSearch.trim().toLocaleLowerCase('pt-BR'))).slice(0,6):[];
 const [theme,setTheme]=useState('blackhole');
 const [profile,setProfile]=useState({display_name:'',avatar_path:''});
 const [avatarUrl,setAvatarUrl]=useState('');
 const appearanceRef=useRef({colors:{},backgroundUrl:''});
 useEffect(()=>{
  const db=getClient();if(!db)return;
  let alive=true;
  let request=0;
  async function refreshProfile(){
   const current=++request;
   const {data,error}=await db.auth.getUser();
   if(!alive||current!==request||error||!data?.user)return;
   const user=data.user,metadata=user.user_metadata||{};
   setProfile({display_name:String(metadata.display_name||metadata.full_name||''),avatar_path:String(metadata.avatar_path||'')});
   const backgroundPath=String(metadata.crm_background_path||'');
   const safePath=backgroundPath.startsWith(user.id+'/background-')&&/\.(png|jpg|webp)$/.test(backgroundPath)?backgroundPath:'';
   const [photo,background]=await Promise.all([
    ownerAvatarPath(user.id,metadata.avatar_path)?db.storage.from(PROFILE_BUCKET).createSignedUrl(metadata.avatar_path,3600):Promise.resolve({data:null}),
    safePath?db.storage.from(APPEARANCE_BUCKET).createSignedUrl(safePath,3600):Promise.resolve({data:null})
   ]);
   if(!alive||current!==request)return;
   setAvatarUrl(photo.error?'':photo.data?.signedUrl||'');
   const colors=metadata.crm_colors&&typeof metadata.crm_colors==='object'?metadata.crm_colors:{};
   appearanceRef.current={colors,backgroundUrl:background?.data?.signedUrl||''};
   const currentTheme=resolveTheme(window.localStorage.getItem('projectw1sc.crm-theme')||'blackhole');
   try{applyAppearanceToDocument(document.documentElement,CRM_THEMES.find(t=>t.id===currentTheme),colors,appearanceRef.current.backgroundUrl)}
   catch{applyAppearanceToDocument(document.documentElement,CRM_THEMES.find(t=>t.id===currentTheme),{},appearanceRef.current.backgroundUrl)}
  }
  function scheduleRefresh(){window.setTimeout(refreshProfile,0)}
  const {data:{subscription}}=db.auth.onAuthStateChange(()=>{scheduleRefresh()});
  window.addEventListener('projectw1sc:profile-change',scheduleRefresh);
  window.addEventListener('projectw1sc:appearance-change',scheduleRefresh);
  refreshProfile();
  return()=>{alive=false;subscription.unsubscribe();window.removeEventListener('projectw1sc:profile-change',scheduleRefresh);window.removeEventListener('projectw1sc:appearance-change',scheduleRefresh)};
 },[]);
  const sidebarRef=useRef(null);
 useEffect(()=>{
  // BLACKHOLE fixo: não herdar a skin antiga do ProjectW1SC/Infinitum do localStorage.
 useEffect(()=>{
  document.documentElement.dataset.crmTheme='blackhole';
  const current=CRM_THEMES.find(t=>t.id==='blackhole');
  applyAppearanceToDocument(document.documentElement,current,{},'');
  try{window.localStorage.setItem('projectw1sc.crm-theme','blackhole')}catch{}
  setTheme('blackhole');
 },[]);
 function selectTheme(next){
  const id=resolveTheme(next);
  setTheme(id);document.documentElement.dataset.crmTheme=id;
   const t=CRM_THEMES.find(x=>x.id===id);try{applyAppearanceToDocument(document.documentElement,t,appearanceRef.current.colors,appearanceRef.current.backgroundUrl)}catch{applyAppearanceToDocument(document.documentElement,t,{},appearanceRef.current.backgroundUrl)}
  try{window.localStorage.setItem('projectw1sc.crm-theme',id)}catch{}
 }
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
 return <div className={'app-shell blackhole-studio-shell '+(sidebarExpanded?'sidebar-expanded':'sidebar-collapsed')}>
  <aside ref={sidebarRef} className="app-sidebar"
    onMouseEnter={()=>setSidebarExpanded(true)}
    onMouseLeave={shrinkIfUnfocused}
    onFocusCapture={()=>setSidebarExpanded(true)}
    onBlurCapture={event=>{
     if(!event.currentTarget.contains(event.relatedTarget))setSidebarExpanded(false);
    }}>
   <div className="app-identity">
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
   <div className="app-section-name">ESCRITÓRIO JURÍDICO</div>
   <nav aria-label="Navegação principal" className="app-nav">
    {CRM_AREAS.map(item=>{
     const Icon=icons[item.label];
     return <Link key={item.key} href={item.path} prefetch={false} aria-current={active===item.label?'page':undefined} className={'app-nav-link '+(active===item.label?'active':'')} title={sidebarExpanded?undefined:item.label} aria-label={item.label} onClick={e=>{
       if(onNavigate&&!['Clientes','Processos','Scanner judicial','Prazos','Fluxos (POP)','Audiências','Peças e petições','WhatsApp','Leads','Superagente','Mini Agentes','Gerador de processos','Relatórios','Integrações','Configurações'].includes(item.label)&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){
        e.preventDefault();onNavigate(item.label);setSidebarExpanded(false);
       }
      }} ><Icon size={17} aria-hidden="true"/><span>{item.label}</span></Link>;
    })}
   </nav>
   <footer className="app-nav-footer">
    <div className="app-private"><span>Dados privados, rastreáveis e<br/>vinculados à origem.</span></div>
    <small className="app-account-email" title={email}><Mail size={14}/><span><strong className="app-profile-label">{profile.display_name||'Meu perfil'}</strong>{email}</span></small>
    <div className="app-account-actions">
     {onPassword?<button onClick={onPassword} type="button"><KeyRound size={14}/> Alterar senha</button>:<a href="/?senha=1"><KeyRound size={14}/> Alterar senha</a>}
     <button onClick={onSignOut} type="button"><LogOut size={14}/> Sair</button>
    </div>
    <small className="app-copyright" aria-label="Direitos autorais da W1 Capital">© 2026 BLACKHOLE · W1 Capital</small>
   </footer>
  </aside>
  <div className="app-content"><div className="reference-top-tools">
   <div className="blackhole-shell-breadcrumb"><img src="/branding/blackhole-symbol.svg" alt="" width="31" height="20"/><Link href="/" prefetch={false}>BLACKHOLE</Link><span className="blackhole-shell-crumb-sep">/</span><strong>{active}</strong></div>
   <div className="blackhole-shell-tools">
    <div className="blackhole-shell-search"><Search size={15}/><input ref={navSearchRef} type="search" value={navSearch} onChange={e=>setNavSearch(e.target.value)} aria-label="Pesquisar abas do escritório" placeholder="Buscar uma área..."/><kbd><Command size={12}/> K</kbd>
     {!!navSearch.trim()&&<div className="blackhole-shell-search-results" role="listbox">{matches.length?matches.map(x=><Link key={x.key} href={x.path} prefetch={false} onClick={()=>setNavSearch('')}>{x.label}</Link>):<span>Nenhuma área encontrada.</span>}</div>}
    </div>
   <span className="bh-theme-identity" title="BLACKHOLE · horizonte de eventos"><img src="/branding/blackhole-symbol.svg" alt="" width="29" height="19"/> BLACKHOLE</span>
   <Link href="/prazos?status=vencidos" prefetch={false} aria-label="Ver retornos vencidos" title="Ver retornos vencidos" className="reference-top-alert"><Bell size={20}/>{overdueCount>0&&<span className="reference-notification-dot"/>}</Link><span className="reference-top-divider"/><Link className="reference-top-avatar" href="/configuracoes" prefetch={false} title={profile.display_name||'Configurações do perfil'} aria-label="Abrir configurações do perfil">{avatarUrl?<img src={avatarUrl} alt="Foto do perfil"/>:(profile.display_name||email||'W').charAt(0).toLocaleUpperCase('pt-BR')}</Link></div></div>{children}</div>
 </div>;
}
