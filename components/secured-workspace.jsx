'use client';
import {useEffect,useMemo,useState} from 'react';
import CrmShell from './crm-shell';
import {getClient} from '../lib/supabase-client';
import {useCrmAccess} from '../lib/use-crm-access';
export default function SecuredWorkspace({active,children}){
 const db=useMemo(()=>getClient(),[]);
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true);
 const access=useCrmAccess(db,session?.user);
 useEffect(()=>{
  if(!db){setLoading(false);return}
  let alive=true;
  const {data:{subscription}}=db.auth.onAuthStateChange((_,s)=>{if(alive){setSession(s);setLoading(false)}});
  db.auth.getSession().then(({data})=>{if(alive){setSession(data.session);setLoading(false)}}).catch(()=>setLoading(false));
  return()=>{alive=false;subscription.unsubscribe()}
 },[db]);
 if(!db)return <main className="reference-auth">Supabase não configurado.</main>;
 if(loading||access.loading)return <main className="reference-auth">Verificando sessão e permissão...</main>;
 if(!session)return <main className="reference-auth"><p>Entre na sua conta para acessar a carteira.</p><a href="/">Ir para login</a></main>;
 if(!access.allowed)return <main className="reference-auth">Usuário sem permissão para esta carteira.</main>;
 return <CrmShell active={active} email={session.user.email} onSignOut={()=>db.auth.signOut()}>
  {children({db,session})}
 </CrmShell>;
}
