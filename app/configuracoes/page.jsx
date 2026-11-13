'use client';
import {useEffect,useMemo,useState} from 'react';
import {Camera,Check,ChevronLeft,Eye,EyeOff,Image as ImageIcon,KeyRound,LockKeyhole,Palette,Save,ShieldCheck,UserRound,Users,Trash2,UploadCloud} from 'lucide-react';
import CrmShell from '../../components/crm-shell';
import ProfessionalAuth from '../../components/professional-auth';
import {getClient} from '../../lib/supabase-client';
import {useCrmAccess} from '../../lib/use-crm-access';
import {ADMIN_EMAIL,changePassword} from '../../lib/login.mjs';
import {CRM_THEMES,resolveTheme} from '../../lib/crm-themes.mjs';
import {PROFILE_BUCKET,validateProfileName,validateAvatarFile,avatarPathFor,validatePasswordChange,ownerAvatarPath} from '../../lib/profile-settings.mjs';
import {APP_COLORS,APPEARANCE_BUCKET,appearanceDefaults,validateAppearance,validateImageFile,appearancePathFor,applyAppearanceToDocument} from '../../lib/appearance-settings.mjs';

const labelForTheme=id=>CRM_THEMES.find(x=>x.id===id)?.label||'Principal · Prestige';
export default function SettingsPage(){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const access=useCrmAccess(db,session?.user);
 const [displayName,setDisplayName]=useState(''),[photo,setPhoto]=useState(null),[photoPreview,setPhotoPreview]=useState(''),[avatarUrl,setAvatarUrl]=useState('');
 const [newMemberEmail,setNewMemberEmail]=useState(''),[newMemberPassword,setNewMemberPassword]=useState(''),[memberSaving,setMemberSaving]=useState(false);
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false);
 const [theme,setTheme]=useState('infinitum'),[saving,setSaving]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [colors,setColors]=useState(()=>appearanceDefaults(CRM_THEMES[0]));
 const [backgroundFile,setBackgroundFile]=useState(null),[backgroundPreview,setBackgroundPreview]=useState(''),[backgroundUrl,setBackgroundUrl]=useState(''),[removeBackground,setRemoveBackground]=useState(false);
 const user=session?.user;
 useEffect(()=>{
  let saved='infinitum';try{saved=localStorage.getItem('projectw1sc.crm-theme')||'infinitum'}catch{}
  const selected=resolveTheme(saved);setTheme(selected);setColors(appearanceDefaults(CRM_THEMES.find(t=>t.id===selected)));
  if(!db){setLoading(false);return}
  let active=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(active){setSession(s);setLoading(false)}});
  db.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false)}}).catch(()=>setLoading(false));
  return()=>{active=false;subscription.unsubscribe()};
 },[db]);
 useEffect(()=>{
  if(!user)return;
  setDisplayName(String(user.user_metadata?.display_name||user.user_metadata?.full_name||''));
  const t=CRM_THEMES.find(x=>x.id===resolveTheme(window.localStorage.getItem('projectw1sc.crm-theme')||'infinitum'));
  try{setColors(validateAppearance(user.user_metadata?.crm_colors||{},t))}
  catch{setColors(appearanceDefaults(t))}
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
 useEffect(()=>{
  const path=String(user?.user_metadata?.crm_background_path||'');
  if(!user?.id||!path.startsWith(user.id+'/background-')||!db){setBackgroundUrl('');return}
  let active=true;
  db.storage.from(APPEARANCE_BUCKET).createSignedUrl(path,3600).then(({data,error})=>{
   if(active)setBackgroundUrl(error?'':data?.signedUrl||'');
  });return()=>{active=false};
 },[db,user?.id,user?.user_metadata?.crm_background_path]);
 useEffect(()=>{
  if(!backgroundFile){setBackgroundPreview('');return}
  const url=URL.createObjectURL(backgroundFile);setBackgroundPreview(url);
  return()=>URL.revokeObjectURL(url);
 },[backgroundFile]);
 function changeColor(field,value){
  const changed={...colors,[field]:value};
  setColors(changed);
  const palette=CRM_THEMES.find(t=>t.id===theme)||CRM_THEMES[0];
  try{const validated=validateAppearance(changed,palette);applyAppearanceToDocument(document.documentElement,palette,validated,removeBackground?'':backgroundUrl);setError('')}
  catch(err){setError(err.message)}
 }
 function chooseBackground(e){
  const image=e.target.files?.[0];e.target.value='';
  if(!image)return;
  try{validateImageFile(image,'background');setBackgroundFile(image);setRemoveBackground(false);setError('')}
  catch(err){setError(err.message)}
 }
 async function saveAppearance(e){
  e.preventDefault();if(!db||saving||!user)return;
  const palette=CRM_THEMES.find(t=>t.id===theme)||CRM_THEMES[0];
  let valid;
  try{valid=validateAppearance(colors,palette);if(backgroundFile)validateImageFile(backgroundFile,'background')}
  catch(err){setError(err.message);return}
  setSaving('appearance');setError('');setMessage('');
  const oldPath=String(user.user_metadata?.crm_background_path||'');
  let newPath=null;
  try{
   if(backgroundFile){
    newPath=appearancePathFor(user.id,'background',backgroundFile.type,crypto.randomUUID());
    const upload=await db.storage.from(APPEARANCE_BUCKET).upload(newPath,backgroundFile,{contentType:backgroundFile.type,cacheControl:'3600',upsert:false});
    if(upload.error)throw Error('Não foi possível salvar o fundo: '+upload.error.message);
   }
   const target=removeBackground?null:newPath||oldPath||null;
   const updated=await db.auth.updateUser({data:{crm_colors:valid,crm_background_path:target}});
   if(updated.error)throw Error('Não foi possível salvar a aparência: '+updated.error.message);
   if(oldPath&&(removeBackground||newPath)&&oldPath.startsWith(user.id+'/'))await db.storage.from(APPEARANCE_BUCKET).remove([oldPath]);
   let nextUrl=removeBackground?'':backgroundUrl;
   if(newPath){
    const {data,error}=await db.storage.from(APPEARANCE_BUCKET).createSignedUrl(newPath,3600);
    nextUrl=error?'':data?.signedUrl||'';
   }
   setBackgroundUrl(nextUrl);setBackgroundFile(null);setRemoveBackground(false);
   setSession(previous=>({...previous,user:updated.data?.user||user}));
   applyAppearanceToDocument(document.documentElement,palette,valid,nextUrl);
   window.dispatchEvent(new Event('projectw1sc:appearance-change'));
   setMessage('Aparência salva. Cores e fundo serão utilizados nas demais abas.');
  }catch(err){
   if(newPath)await db.storage.from(APPEARANCE_BUCKET).remove([newPath]).catch(()=>{});
   setError(err.message||'Não foi possível salvar as preferências.');
  }finally{setSaving('')}
 }
  function setChosenTheme(value){
  const next=resolveTheme(value);setTheme(next);
  const palette=CRM_THEMES.find(t=>t.id===next);
  const defaults=appearanceDefaults(palette);setColors(defaults);
  document.documentElement.dataset.crmTheme=next;
  try{localStorage.setItem('projectw1sc.crm-theme',next)}catch{}
  window.dispatchEvent(new Event('projectw1sc:theme-change'));
  applyAppearanceToDocument(document.documentElement,palette,defaults,backgroundUrl);
  setMessage('Tema '+labelForTheme(next)+' aplicado. Salve a aparência para guardar suas cores.');setError('');
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
 async function createMember(e){
  e.preventDefault();
  if(memberSaving||!db)return;
  setMemberSaving(true);setError('');setMessage('');
  try{
   const {data,error}=await db.functions.invoke('projectw1sc-provision-account',{
    body:{email:newMemberEmail.trim().toLowerCase(),password:newMemberPassword}
   });
   if(error)throw new Error(data?.error||error.message||'Não foi possível cadastrar a conta.');
   if(!data?.ok)throw new Error(data?.error||'O cadastro não foi confirmado.');
   setMessage('Conta criada e autorizada a acessar a mesma carteira do CRM.');
   setNewMemberPassword('');
  }catch(e){setError(e.message||'Falha ao adicionar usuário.')}
  finally{setMemberSaving(false)}
 }
 if(!db)return <main className="reference-auth">Configuração do Supabase indisponível.</main>;
 if(loading)return <main className="reference-auth">Verificando sua sessão...</main>;
 if(!session)return <ProfessionalAuth eyebrow="PREFERÊNCIAS DA CONTA" title="Acesse configurações" description="Para alterar seu perfil e as preferências do CRM, faça login primeiro."><a className="w1-auth-submit" href="/">Ir para a tela de acesso</a></ProfessionalAuth>;
 if(access.loading)return <main className="reference-auth">Validando permissão...</main>;
 if(!access.allowed)return <main className="reference-auth">Conta não autorizada. <button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 const preferred=displayName||user.email?.split('@')[0]||'Usuário';
 return <CrmShell active="Configurações" email={user.email} onSignOut={()=>db.auth.signOut()}>
  <main className="reference-dashboard settings-dashboard">
   <header className="reference-header"><div><div className="reference-overline">PROJECTW1SC · PREFERÊNCIAS DA CONTA</div><h1>Configurações</h1><p>Escolha entre o visual principal e o tema claro do vídeo. Ajuste seu perfil e a segurança do acesso.</p></div><div className="reference-actions"><a className="reference-outline" href="/"><ChevronLeft size={17}/> Voltar ao início</a></div></header>
   {(error||message)&&<div role={error?'alert':'status'} className={'settings-feedback '+(error?'bad':'good')}>{error||message}<button type="button" onClick={()=>{setError('');setMessage('')}} aria-label="Fechar aviso">×</button></div>}
   <section className="reference-panel settings-panel" aria-label="Seleção de tema"><div className="settings-section-heading"><span className="settings-section-icon"><Palette size={21}/></span><div><h2>Visual do CRM</h2><p>O tema principal mantém o Prestige. O segundo reproduz a linguagem clara, menu compacto e quadros do vídeo do INFINITUM.</p></div></div><div className="settings-theme-grid">{CRM_THEMES.map(t=><button key={t.id} type="button" className={'settings-theme-option '+(theme===t.id?'selected':'')} aria-pressed={theme===t.id} onClick={()=>setChosenTheme(t.id)}><span className="settings-theme-preview" style={{background:t.page,borderColor:t.border}}><span className="settings-theme-nav" style={{background:t.nav}}/><span className="settings-theme-preview-content"><i style={{background:t.surface,borderColor:t.border}}/><i style={{background:t.tint,borderColor:t.border}}/><i style={{background:t.surface,borderColor:t.border}}/></span></span><span className="settings-theme-option-label">{t.label}{theme===t.id&&<Check size={15}/>}</span></button>)}</div><div className="settings-hint"><ShieldCheck size={16}/> Seleção preservada entre páginas e novas sessões neste navegador. Animações leves nos dois temas.</div></section>
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
   {user.email?.toLowerCase()===ADMIN_EMAIL&&<section className="reference-panel settings-panel" aria-label="Gestão de acesso">
    <div className="settings-section-heading"><span className="settings-section-icon"><Users size={21}/></span><div><h2>Adicionar usuário ao CRM</h2><p>Crie uma conta individual com acesso aos mesmos clientes, processos, tarefas e relatórios. Os dados continuam na mesma base.</p></div></div>
    <form className="settings-form" onSubmit={createMember}>
     <label>E-mail da nova pessoa<input type="email" required autoComplete="off" value={newMemberEmail} onChange={e=>setNewMemberEmail(e.target.value)} placeholder="exemplo@empresa.com"/></label>
     <label>Senha inicial<input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={newMemberPassword} onChange={e=>setNewMemberPassword(e.target.value)} placeholder="Escolha uma senha temporária"/></label>
     <p className="settings-security-note"><ShieldCheck size={15}/> Apenas o administrador principal pode criar contas. Recomenda-se trocar a senha temporária no primeiro acesso.</p>
     <button className="reference-primary" type="submit" disabled={memberSaving}><Users size={16}/>{memberSaving?'Criando acesso...':'Criar usuário com acesso completo'}</button>
    </form>
   </section>}
  </main>
 </CrmShell>;
}
