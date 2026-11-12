// Integração SOMENTE com os endpoints publicados na documentação Swagger do Infinitum.
// Não realiza login de terceiros, não usa APIs internas e não aceita URLs arbitrárias.
const ROOT='/api/v1/public';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const requireId=(id,what)=>{if(!UUID.test(String(id||'')))throw new Error('Identificador de '+what+' inválido.');return id;};
const number=(x,fallback,max)=>{const n=Number(x);return Number.isSafeInteger(n)&&n>0?Math.min(n,max):fallback};
export function buildInfinitumPath(resource,params={}){
 const org=()=>requireId(params.organization_id,'organização'),pop=()=>requireId(params.pop_id,'procedimento');
 if(resource==='organizations')return ROOT+'/organizations/my';
 if(resource==='pops')return ROOT+'/organizations/'+org()+'/pops';
 if(resource==='pop')return ROOT+'/pops/'+pop();
 if(resource==='pop-with-phases')return ROOT+'/pops/'+pop()+'/with-phases';
 if(resource==='phases')return ROOT+'/pops/'+pop()+'/phases';
 if(resource==='tags')return ROOT+'/pops/'+pop()+'/tags';
 if(resource==='sectors')return ROOT+'/pops/sectors';
 if(resource==='types')return ROOT+'/pops/types';
 if(resource==='cards'){
  const qs=new URLSearchParams({organization_id:org(),page:String(number(params.page,1,100)),limit:String(number(params.limit,20,50))});
  if(params.pop_id)qs.set('pop_id',pop());
  if(params.phase_id)qs.set('phase_id',requireId(params.phase_id,'fase'));
  return ROOT+'/cards?'+qs.toString();
 }
 throw new Error('Operação não permitida pela integração pública Infinitum.');
}
export function validateInfinitumApiResponse(data){
 if(typeof data==='string'&&/^\s*</.test(data))throw new Error('A API retornou HTML, não JSON.');
 if(data===null||typeof data!=='object')throw new Error('Resposta JSON inesperada da API.');
 return data;
}
export async function getInfinitumPublicResource({token,resource,params={},fetchImpl=fetch,timeout=9000}){
 if(!token||String(token).length>512)throw new Error('Token público da organização não configurado.');
 const path=buildInfinitumPath(resource,params);
 const response=await fetchImpl('https://public.infinitum.app.br'+path,{
  method:'GET',headers:{'X-Public-Token':token,Accept:'application/json'},
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(timeout)
 });
 if(!response.ok){
  const e=new Error(response.status===401||response.status===403?'O Infinitum recusou o token/permissão de acesso.':response.status===429?'Infinitum limitou a taxa de requisições.':'API pública Infinitum temporariamente indisponível (HTTP '+response.status+').');
  e.status=response.status;throw e;
 }
 const length=Number(response.headers?.get?.('content-length')||0);
 if(length>1600000)throw new Error('Resposta da API excede limite de tamanho.');
 const raw=await response.text();
 if(raw.length>1600000)throw new Error('Resposta da API excede limite de tamanho.');
 if(raw.trimStart().startsWith('<'))throw new Error('A API retornou HTML, não JSON.');
 try{return validateInfinitumApiResponse(JSON.parse(raw))}
 catch(e){throw new Error('Formato da resposta pública Infinitum inválido: '+e.message)}
}
