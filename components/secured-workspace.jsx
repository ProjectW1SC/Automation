'use client';
import {useEffect,useMemo,useState} from 'react';
import CrmShell from './crm-shell';
import ProfessionalAuth from './professional-auth';
import {getClient} from '../lib/supabase-client';
import {useCrmAccess} from '../lib/use-crm-access';
export default function SecuredWorkspace({active,children}){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [recovery,setRecovery]=useState(false),[newPassword,setNewPassword]=useState('');
 const access=useCrmAccess(db,session?.user);
 useEffect(()=>{
  if(!db){setLoading(false);return}
  let alive=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((event,s)=>{
   if(alive){setSession(s);setLoading(false);if(event==='PASSWORD_RECOVERY')setRecovery(true)}
  });
  db.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setLoading(false)}}).catch(()=>setLoading(false));
  return()=>{alive=false;subscription.unsubscribe()}
 },[db]);
 async function login(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  const {error}=await db.auth.signInWithPassword({email:email.trim(),password});
  if(error)setError(error.message||'Login não autorizado.');else setPassword('');
  setBusy(false);
 }
 async function reset(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  const {error}=await db.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/'});
  setError(error?'Recuperação indisponível: '+error.message:'Se houver conta cadastrada, enviaremos instruções ao e-mail informado.');
  setBusy(false);
 }
 async function updatePassword(e){e.preventDefault();if(!db||busy)return;setBusy(true);setError('');
  const {error}=await db.auth.updateUser({password:newPassword});
  setError(error?'Não foi possível atualizar: '+error.message:'Senha atualizada.');if(!error){setRecovery(false);setNewPassword('')}
  setBusy(false);
 }
 if(!db)return <main className="reference-auth">A conexão segura do Supabase não está configurada.</main>;
 if(loading||access.loading)return <main className="reference-auth">Verificando sessão e permissões do escritório...</main>;
 if(!session)return <ProfessionalAuth title="Acesso ao escritório" eyebrow="GESTÃO JURÍDICA" description="Entre para acessar clientes, processos, prazos e agentes autorizados.">
  <form className="office-login-form" onSubmit={login}>
   <label>E-mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
   <label>Senha<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
   {error&&<p role="status" className="inf-note">{error}</p>}
   <button disabled={busy} className="inf-btn primary">{busy?'Autenticando...':'Entrar no escritório'}</button>
  </form><form onSubmit={reset} className="office-login-recovery"><button type="submit" className="inf-btn" disabled={busy||!email}>Enviar recuperação por e-mail</button></form>
 </ProfessionalAuth>;
 if(recovery)return <ProfessionalAuth title="Criar nova senha" eyebrow="RECUPERAÇÃO" description="Defina uma senha segura.">
  <form className="office-login-form" onSubmit={updatePassword}>
   <label>Nova senha<input required type="password" minLength={10} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></label>
   {error&&<p role="status">{error}</p>}
   <button className="inf-btn primary" disabled={busy}>Alterar senha</button>
  </form>
 </ProfessionalAuth>;
 if(!access.allowed)return <main className="reference-auth">Sua conta não está habilitada para esta carteira jurídica. <button onClick={()=>db.auth.signOut()}>Sair</button></main>;
 return <CrmShell active={active} email={session.user.email} onSignOut={()=>db.auth.signOut()}>
  {children({db,session})}
 </CrmShell>;
}
