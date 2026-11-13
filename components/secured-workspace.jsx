'use client';
import {useEffect,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import CrmShell from './crm-shell';
import ProfessionalAuth from './professional-auth';
import {useWorkspaceSession} from './workspace-session-provider';
import {getRememberOfficeSession,setRememberOfficeSession} from '../lib/supabase-office-storage.mjs';
export default function SecuredWorkspace({active,children}){
 const {db,session,loading,authFault,access}=useWorkspaceSession();
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState(false),[newPassword,setNewPassword]=useState('');
 const [mode,setMode]=useState('login'),[showPassword,setShowPassword]=useState(false);
 const [remember,setRemember]=useState(true);const [googleEnabled,setGoogleEnabled]=useState(null);
 useEffect(()=>{
  try{if(window.sessionStorage.getItem('blackhole-password-recovery')==='1'){
   setRecovery(true);window.sessionStorage.removeItem('blackhole-password-recovery');
  }}catch{}
 },[session]);
 useEffect(()=>{setRemember(getRememberOfficeSession())},[]);
 useEffect(()=>{let alive=true;const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(url&&key)fetch(url+'/auth/v1/settings',{headers:{apikey:key},cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{if(alive&&typeof j?.external?.google==='boolean')setGoogleEnabled(j.external.google)}).catch(()=>{});
  return()=>{alive=false};
 },[]);
 function setModeTo(next){setMode(next);setError('');setShowPassword(false);setPassword('')}
 async function login(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  setRememberOfficeSession(remember);
  const {error:err}=await db.auth.signInWithPassword({email:email.trim(),password});
  if(err)setError(err.message||'Credenciais não autorizadas.');else setPassword('');
  setBusy(false);
 }
 async function signup(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  setRememberOfficeSession(remember);
  const {data,error:err}=await db.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin}});
  if(err)setError('Cadastro não concluído: '+err.message);
  else setError(data?.session?'Conta criada. O acesso à carteira depende de aprovação do administrador.':'Confira seu e-mail para confirmar a conta. O acesso ao escritório depende de aprovação.');
  setBusy(false);setPassword('');
 }
 async function magicLink(){if(!db||busy)return;
  if(!email.trim()||!email.includes('@')){setError('Informe seu e-mail acima para receber um link de acesso.');return}
  setBusy(true);setError('');const {error:err}=await db.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin+'/',shouldCreateUser:false}});
  setError(err?'Não foi possível enviar o link: '+err.message:'Se o e-mail estiver autorizado, receberá um link de acesso. Confira também a caixa de spam.');setBusy(false);
 }
 async function google(){
  if(!db||busy)return;if(googleEnabled===false){setError('Google não foi habilitado neste Supabase. Use e-mail e senha ou link de acesso.');return}setBusy(true);setError('');
  setRememberOfficeSession(remember);
  const {error:err}=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}});
  if(err){setError('Google indisponível: '+err.message);setBusy(false)}
 }
 async function reset(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  if(!email.trim()){setError('Informe primeiro seu e-mail.');setBusy(false);return}
  const {error:err}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/'});
  setError(err?'Recuperação indisponível: '+err.message:'Se houver conta cadastrada, as instruções serão enviadas para seu e-mail.');
  setBusy(false);
 }
 async function updatePassword(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  const {error:err}=await db.auth.updateUser({password:newPassword});
  setError(err?'Não foi possível atualizar: '+err.message:'Senha atualizada.');if(!err){setRecovery(false);setNewPassword('')}
  setBusy(false);
 }
 function resetLocalSession(){
  // A chave é derivada somente do projeto atual; não altera outras contas/apps Supabase.
  try{
    const project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
    const key='sb-'+project+'-auth-token';
    window.localStorage.removeItem(key);window.sessionStorage.removeItem(key);
  }catch{}
  window.location.reload();
 }
 if(authFault||access.error)return <main className="reference-auth blackhole-auth-fault" role="alert">
   <strong>BLACKHOLE · conexão de acesso interrompida</strong>
   <p>{authFault||access.error}</p>
   <p>A autenticação não foi presumida. Seus dados permanecem preservados.</p>
   <div className="office-action-row"><button className="inf-btn primary" type="button" onClick={()=>window.location.reload()}>Tentar novamente</button>
   <button className="inf-btn" type="button" onClick={resetLocalSession}>Entrar novamente (encerrar sessão local)</button></div>
  </main>;
 if(!db)return <main className="reference-auth">A conexão segura do Supabase não está configurada.</main>;
 if(loading||access.loading)return <main className="reference-auth">Verificando sessão e permissões do escritório...</main>;
 if(!session&&mode!=='recover'&&!recovery){
  const registration=mode==='signup';
  return <ProfessionalAuth title={registration?'Crie sua conta':'Acesse sua conta'} eyebrow="ACESSO À PLATAFORMA" signupMode={registration}
   description={registration?'Cadastre-se e aguarde autorização do administrador do escritório.':'Entre no CRM e gerencie sua operação jurídica com segurança.'}
   onSignup={()=>setModeTo(registration?'login':'signup')}>
   <form className="office-login-form" onSubmit={registration?signup:login}>
    <label htmlFor="office-login-email">Email</label>
    <input id="office-login-email" name="email" required type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/>
    <div className="office-login-label-row"><label htmlFor="office-login-pass">Senha</label>
     {!registration&&<button type="button" className="office-forgot" onClick={()=>setModeTo('recover')}>Esqueceu a senha?</button>}</div>
    <div className="office-password-field">
     <input id="office-login-pass" name="password" minLength={registration?10:undefined} required type={showPassword?'text':'password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={registration?'new-password':'current-password'}/>
     <button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
    </div>
    <label className="office-remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Lembrar de mim</label>
    {error&&<p role="status" className="office-login-feedback">{error}</p>}
    <button type="submit" className="office-login-primary" disabled={busy}>{busy?'Validando...':registration?'Criar conta':'Entrar'}</button>
    <p className="office-auth-switch">{registration?'Já tem conta?':'Não tem conta?'} <button type="button" onClick={()=>setModeTo(registration?'login':'signup')}>{registration?'Fazer login':'Cadastre-se'}</button></p>
   </form>
   <div className="office-social-divider"><span>OU</span></div>
   <button type="button" className="office-google-btn" onClick={google} disabled={busy||googleEnabled===false}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.35 12.2c0-.7-.07-1.36-.18-2H12v3.8h5.25a4.5 4.5 0 0 1-1.94 2.96v2.45h3.14c1.84-1.69 2.9-4.19 2.9-7.21Z"/><path fill="#34A853" d="M12 21.5c2.62 0 4.83-.87 6.44-2.35l-3.14-2.45c-.87.58-1.98.92-3.3.92-2.53 0-4.67-1.7-5.44-3.98H3.3v2.51A9.75 9.75 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.56 13.64a5.86 5.86 0 0 1 0-3.28V7.84H3.3a9.76 9.76 0 0 0 0 8.32l3.26-2.52Z"/><path fill="#EA4335" d="M12 6.38c1.4 0 2.65.48 3.64 1.43l2.8-2.8C16.8 3.47 14.62 2.5 12 2.5a9.75 9.75 0 0 0-8.7 5.34l3.26 2.52C7.33 8.08 9.47 6.38 12 6.38Z"/></svg>
    {googleEnabled===false?'Google ainda não configurado':'Continuar com Google'}
   </button>
   {googleEnabled===false&&<p className="auth-google-help" role="note">O acesso Google ainda não está habilitado no projeto de autenticação. O administrador deve configurar o provedor Google no Supabase, incluindo as credenciais OAuth e o domínio de retorno. <a href="https://supabase.com/docs/guides/auth/social-sign-in/auth-google" target="_blank" rel="noopener noreferrer">Como ativar o login Google</a></p>}
   {!registration&&<button type="button" className="crm-magic-link-btn" onClick={magicLink} disabled={busy}>Receber link de acesso por e-mail (grátis)</button>}
  </ProfessionalAuth>;
 }
 if(recovery||mode==='recover'){
  return <ProfessionalAuth title={recovery?'Criar nova senha':'Recuperar acesso'} description={recovery?'Defina sua nova senha.':'Envie um link de recuperação ao e-mail cadastrado.'} onSignup={()=>setModeTo('login')}>
   {recovery?<form className="office-login-form" onSubmit={updatePassword}>
    <label htmlFor="office-new-pass">Nova senha</label><input id="office-new-pass" required type="password" minLength={10} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/>
    {error&&<p role="status">{error}</p>}
    <button className="office-login-primary" disabled={busy}>Alterar senha</button>
   </form>:<form className="office-login-form" onSubmit={reset}>
    <label htmlFor="office-recover-email">Email</label><input id="office-recover-email" required type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
    {error&&<p role="status">{error}</p>}
    <button className="office-login-primary" disabled={busy}>Enviar instruções</button>
    <button type="button" className="office-forgot" onClick={()=>setModeTo('login')}>Voltar ao login</button>
   </form>}
  </ProfessionalAuth>
 }
 if(!access.allowed)return <main className="reference-auth">Conta autenticada, mas ainda sem acesso à carteira jurídica. O administrador deve habilitar sua participação no escritório. <button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 return <CrmShell active={active} email={session.user.email} onSignOut={()=>db.auth.signOut()}>
  {children({db,session})}
 </CrmShell>;
}
