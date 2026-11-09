'use client';
import {useEffect,useMemo,useState} from 'react';
import {Camera,Check,ChevronLeft,Eye,EyeOff,Image as ImageIcon,KeyRound,LockKeyhole,Palette,Save,ShieldCheck,UserRound,Trash2,UploadCloud} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import {getClient} from '../../lib/supabase-client';
import {ADMIN_EMAIL,changePassword} from '../../lib/login.mjs';
import {CRM_THEMES,resolveTheme} from '../../lib/crm-themes.mjs';
import {PROFILE_BUCKET,validateProfileName,validateAvatarFile,avatarPathFor,validatePasswordChange,ownerAvatarPath} from '../../lib/profile-settings.mjs';

const labelForTheme=id=>CRM_THEMES.find(x=>x.id===id)?.label||'Vinho clássico';
export default function SettingsPage(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const [displayName,setDisplayName]=useState(''),[photo,setPhoto]=useState(null),[photoPreview,setPhotoPreview]=useState(''),[avatarUrl,setAvatarUrl]=useState('');
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false);
 const [theme,setTheme]=useState('vinho'),[saving,setSaving]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const user=session?.user;
 useEffect(()=>{
  let saved='vinho';try{saved=localStorage.getItem('projectw1sc.crm-theme')||'vinho'}catch{}
  setTheme(resolveTheme(saved));
  if(!db){setLoading(false);return}
  let active=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(active){setSession(s);setLoading(false)}});
  db.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false)}}).catch(()=>setLoading(false));
  return()=>{active=false;subscription.unsubscribe()};
 },[db]);
 useEffect(()=>{
  if(!user)return;
  setDisplayName(String(user.user_metadata?.display_name||user.user_metadata?.full_name||''));
  const path=user.user_metadata?.avatar_path;
  if(!ownerAvatarPath(user.id,path)){setAvatarUrl('');return}
  let active=true;
  db.storage.from(PROFILE_BUCKET).createSignedUrl(path,3600).then(({data,error})=>{
   if(active)setAvatarUrl(error?'':data?.signedUrl||'');
  });
  return()=>{active=false};
 },[db,user?.id,user?.user_metadata?.display_name,user?.user_metadata?.avatar_path]);
 useEffect(()=>{
  if(!photo){setPhotoPreview('');return}
  const url=URL.createObjectURL(photo);setPhotoPreview(url);
  return()=>URL.revokeObjectURL(url);
 },[photo]);
 function setChosenTheme(value){
  const next=resolveTheme(value);setTheme(next);
  document.documentElement.dataset.crmTheme=next;
  try{localStorage.setItem('projectw1sc.crm-theme',next)}catch{}
  window.dispatchEvent(new Event('projectw1sc:theme-change'));
  setMessage('Tema '+labelForTheme(next)+' aplicado ao CRM.');setError('');
 }
 function selectPhoto(e){
  const f=e.target.files?.[0]||null;
  try{if(f)validateAvatarFile(f);setPhoto(f);setError('')}catch(err){setPhoto(null);setError(err.message)}
  e.target.value='';
 }
 async function saveProfile(e){
  e.preventDefault();if(!db||saving||!user)return;
  let name;
  try{name=validateProfileName(displayName);if(photo)validateAvatarFile(photo)}
  catch(err){setError(err.message);return}
  setError('');setMessage('');setSaving('profile');
  const previousPath=user.user_metadata?.avatar_path;
  let newPath=null;
  try{
   if(photo){
    const unique=crypto.randomUUID();
    newPath=avatarPathFor(user.id,photo.type,unique);
    const upload=await db.storage.from(PROFILE_BUCKET).upload(newPath,photo,{contentType:photo.type,cacheControl:'3600',upsert:false});
    if(upload.error)throw new Error('Não foi possível salvar a foto: '+upload.error.message);
   }
   const next={display_name:name};
   if(newPath)next.avatar_path=newPath;
   const result=await db.auth.updateUser({data:next});
   if(result.error)throw new Error('Não foi possível alterar o perfil: '+result.error.message);
   const updatedUser=result.data?.user||user;
   setSession(previous=>({...previous,user:updatedUser}));
   setPhoto(null);
   if(newPath){
    const signed=await db.storage.from(PROFILE_BUCKET).createSignedUrl(newPath,3600);
    if(!signed.error)setAvatarUrl(signed.data?.signedUrl||'');
    if(ownerAvatarPath(user.id,previousPath)&&previousPath!==newPath){
      await db.storage.from(PROFILE_BUCKET).remove([previousPath]).catch(()=>{});
    }
   }
   window.dispatchEvent(new Event('projectw1sc:profile-change'));
   setMessage('Nome e foto de perfil atualizados.');
  }catch(err){
   if(newPath){await db.storage.from(PROFILE_BUCKET).remove([newPath]).catch(()=>{})}
   setError(err.message||'Não foi possível salvar o perfil.');
  }finally{setSaving('')}
 }
 async function updatePassword(e){
  e.preventDefault();if(!user||saving)return;
  try{validatePasswordChange(newPassword,confirmPassword);if(!currentPassword)throw new Error('Informe sua senha atual.')}
  catch(err){setError(err.message);return}
  setError('');setMessage('');setSaving('password');
  try{
   const verified=await db.auth.signInWithPassword({email:user.email,password:currentPassword});
   if(verified.error)throw new Error('Senha atual incorreta. Confira e tente novamente.');
   await changePassword(db.auth,newPassword);
   setCurrentPassword('');setNewPassword('');setConfirmPassword('');
   setMessage('Senha atualizada. Use a nova senha nos próximos acessos.');
  }catch(err){setError(err.message||'Não foi possível atualizar a senha.')}
  finally{setSaving('')}
 }
 if(!db)return <main className="reference-auth">Configuração do Supabase indisponível.</main>;
 if(loading)return <main className="reference-auth">Verificando sua sessão...</main>;
 if(!session)return <main className="reference-auth"><div className="reference-auth-card"><h1>Configurações</h1><p>Entre no CRM para alterar seu perfil.</p><a className="reference-primary" href="/">Voltar ao acesso</a></div></main>;
 if(user?.email?.toLowerCase()!==ADMIN_EMAIL)return <main className="reference-auth">Conta não autorizada. <button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 const preferred=displayName||user.email?.split('@')[0]||'Usuário';
 return <CrmShell active="Configurações" email={user.email} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard settings-dashboard">
   <header className="reference-header"><div><div className="reference-overline">PROJECTW1SC · PREFERÊNCIAS DA CONTA</div><h1>Configurações</h1><p>Personalize a aparência, sua identificação e a segurança do acesso.</p></div><div className="reference-actions"><a className="reference-outline" href="/"><ChevronLeft size={17}/> Voltar ao início</a></div></header>
   {(error||message)&&<div role={error?'alert':'status'} className={'settings-feedback '+(error?'bad':'good')}>{error||message}<button type="button" onClick={()=>{setError('');setMessage('')}} aria-label="Fechar aviso">×</button></div>}
   <section className="reference-panel settings-panel">
    <div className="settings-section-heading"><span className="settings-section-icon"><Palette size={21}/></span><div><h2>Aparência do CRM</h2><p>Escolha um tema para todas as abas. As letras e os botões permanecem legíveis.</p></div></div>
    <div className="settings-theme-grid">{CRM_THEMES.map(t=><button type="button" key={t.id} className={'settings-theme-option '+(theme===t.id?'selected':'')} aria-pressed={theme===t.id} onClick={()=>setChosenTheme(t.id)}>
     <span className="settings-theme-preview" style={{background:t.page,borderColor:t.border}}><span className="settings-theme-nav" style={{background:t.nav}}/><span className="settings-theme-preview-content"><i style={{background:t.surface,borderColor:t.border}}/><i style={{background:t.accent}}/><i style={{background:t.surface,borderColor:t.border}}/></span></span>
     <span className="settings-theme-option-label">{t.label}{theme===t.id&&<Check size={16}/>}</span>
    </button>)}</div>
    <div className="settings-hint"><ShieldCheck size={16}/> Temas com cores de texto e fundo verificadas para alto contraste.</div>
   </section>
   <div className="settings-grid">
    <section className="reference-panel settings-panel">
     <div className="settings-section-heading"><span className="settings-section-icon"><UserRound size={21}/></span><div><h2>Meu perfil</h2><p>Seu nome e sua foto serão exibidos no menu do CRM.</p></div></div>
     <form onSubmit={saveProfile} className="settings-form">
      <div className="settings-avatar-edit">
       <span className="settings-avatar-large">{photoPreview||avatarUrl?<img alt="Prévia da sua foto de perfil" src={photoPreview||avatarUrl}/>:preferred.charAt(0).toUpperCase()}</span>
       <div><label className="reference-outline settings-upload-button"><Camera size={17}/> Escolher foto<input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={selectPhoto}/></label><small>JPG, PNG ou WebP · até 2 MB · foto privada</small>{photo&&<button type="button" className="settings-inline-clear" onClick={()=>setPhoto(null)}><Trash2 size={13}/> Descartar seleção</button>}</div>
      </div>
      <label>Nome de exibição<input minLength={2} maxLength={80} required value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Como deseja aparecer no CRM?"/></label>
      <label>E-mail da conta<input value={user.email||''} readOnly aria-label="E-mail cadastrado"/></label>
      <button className="reference-primary" type="submit" disabled={saving==='profile'}><Save size={16}/>{saving==='profile'?'Salvando...':'Salvar perfil'}</button>
     </form>
    </section>
    <section className="reference-panel settings-panel">
     <div className="settings-section-heading"><span className="settings-section-icon"><LockKeyhole size={21}/></span><div><h2>Alterar senha</h2><p>Proteja o acesso à carteira e aos dados privados.</p></div></div>
     <form onSubmit={updatePassword} className="settings-form">
      <label>Senha atual<input type={showPassword?'text':'password'} autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
      <label>Nova senha<input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={10} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="No mínimo 10 caracteres"/></label>
      <label>Confirmar nova senha<input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label>
      <label className="settings-checkbox"><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>} Mostrar senhas</label>
      <button className="reference-primary" type="submit" disabled={saving==='password'}><KeyRound size={16}/>{saving==='password'?'Atualizando...':'Alterar minha senha'}</button>
      <p className="settings-security-note"><ShieldCheck size={15}/> A senha é atualizada diretamente na autenticação segura do Supabase. Não fica salva no CRM.</p>
     </form>
    </section>
   </div>
  </main>
 </CrmShell>;
}
