'use client';
import {useEffect,useState} from 'react';
import {checkCrmAccess} from './crm-access.mjs';

export function useCrmAccess(db,user){
 const [state,setState]=useState({id:null,status:'checking'});
 useEffect(()=>{
  if(!user?.id){setState({id:null,status:'guest'});return}
  let alive=true;
  setState({id:user.id,status:'checking'});
  checkCrmAccess(db,user).then(ok=>{
   if(alive)setState({id:user.id,status:ok?'allowed':'denied'});
  }).catch(()=>{
   if(alive)setState({id:user.id,status:'denied'});
  });
  return()=>{alive=false};
 },[db,user?.id,user?.email]);
 return {
  loading:!!user?.id&&(state.id!==user.id||state.status==='checking'),
  allowed:!!user?.id&&state.id===user.id&&state.status==='allowed'
 };
}
