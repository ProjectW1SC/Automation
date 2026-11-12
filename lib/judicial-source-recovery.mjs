// Fallback transparente: o DataJud é outra fonte, NUNCA uma confirmação do DJEN.
const kind=e=>{
 const status=e?.status||Number(/(?:HTTP\s*)?(403|429|502|503)\b/.exec(String(e?.message||''))?.[1])||0;
 if(status===403)return'blocked_403';
 if(status===429)return'rate_limited_429';
 if(/timeout|tempo limite|esgotado/i.test(String(e?.message||'')))return'timeout';
 return'unavailable';
};
export async function consultJudicialWithFallback({djen,datajud}){
 try{
  const primary=await djen();
  if(primary?.ok===false)throw new Error(primary.error||'DJEN indisponível');
  return {...primary,sourceStatus:{djen:'ok',datajud:'not_checked'},partial:false};
 }catch(error){
  const djenStatus=kind(error);
  try{
   const alt=await datajud();
   if(alt?.ok===false)throw new Error(alt.error||'DataJud indisponível');
   return {...alt,source:'DataJud',partial:true,sourceStatus:{djen:djenStatus,datajud:'ok'},
    notice:'DJEN indisponível ('+djenStatus+'). O DataJud forneceu somente metadados/movimentações alternativas e NÃO confirma publicação no DJEN.'};
  }catch(err){
   return {ok:false,found:false,items:[],partial:true,sourceStatus:{djen:djenStatus,datajud:kind(err)},
    error:'Nem DJEN nem DataJud puderam confirmar esta consulta. Verifique o portal oficial; não houve atualização processual confirmada.'};
  }
 }
}
