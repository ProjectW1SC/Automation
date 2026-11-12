'use client';
import {useEffect,useState} from 'react';
import {checkCrmAccess} from './crm-access.mjs';
import {withAuthDeadline} from './auth-deadline.mjs';
export function useCrmAccess(db,user){
 const [state,setState]=useState({id:null,status:'checking',error:''});
 useEffect(()=>{
  if(!user?.id){setState({id:null,status:'guest',error:''});return}
  let alive=true;
  setState({id:user.id,status:'checking',error:''});
  withAuthDeadline(checkCrmAccess(db,user),9000).then(ok=>{
   if(alive)setState({id:user.id,status:ok?'allowed':'denied',error:''});
  }).catch(error=>{
   if(alive)setState({id:user.id,status:'error',error:error?.message||'Erro de autorização.'});
  });
  return()=>{alive=false};
 },[db,user?.id,user?.email]);
 return {
  loading:!!user?.id&&(state.id!==user.id||state.status==='checking'),
  allowed:!!user?.id&&state.id===user.id&&state.status==='allowed',
  error:state.id===user?.id&&state.status==='error'?state.error:'',
  denied:state.id===user?.id&&state.status==='denied'
 };
}
