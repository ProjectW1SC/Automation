'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {getClient} from '../lib/supabase-client';
import {useCrmAccess} from '../lib/use-crm-access';
import {withAuthDeadline} from '../lib/auth-deadline.mjs';

const WorkspaceContext=createContext(null);

/**
 * Uma única sessão para todo o aplicativo. Next Link troca páginas sem
 * desmontar esse provedor; validação de permissão e Web Lock não recomeçam
 * a cada aba, mesmo em computadores com pouca RAM.
 */
export function WorkspaceSessionProvider({children}){
 const db=useMemo(()=>getClient(),[]);
 const [state,setState]=useState({session:null,loading:true,authFault:''});
 const access=useCrmAccess(db,state.session?.user);
 useEffect(()=>{
  if(!db){setState({session:null,loading:false,authFault:''});return}
  let alive=true,subscription=null;
  async function initialize(){
   try{
    const {data,error}=await withAuthDeadline(db.auth.getSession(),9000);
    if(!alive)return;
    if(error)throw error;
    setState({session:data?.session||null,loading:false,authFault:''});
    const {data:sub}=db.auth.onAuthStateChange((event,s)=>{
     if(!alive)return;
     setState({session:s||null,loading:false,authFault:''});
     if(event==='PASSWORD_RECOVERY'){
      try{window.sessionStorage.setItem('blackhole-password-recovery','1')}catch{}
     }
    });
    subscription=sub.subscription;
    if(!alive)subscription.unsubscribe();
   }catch(e){
    if(alive)setState(old=>({...old,loading:false,authFault:e?.message||'A sessão não respondeu dentro do prazo.'}));
   }
  }
  initialize();
  return()=>{alive=false;subscription?.unsubscribe()};
 },[db]);
 const value=useMemo(()=>({db,session:state.session,loading:state.loading,
  authFault:state.authFault,access}),[db,state,access.loading,access.allowed,access.denied,access.error]);
 return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspaceSession(){
 const ctx=useContext(WorkspaceContext);
 if(!ctx)throw new Error('BLACKHOLE necessita do provedor persistente de autenticação.');
 return ctx;
}
