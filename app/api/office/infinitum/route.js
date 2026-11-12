import {officeAuth,officeJson,safeOfficeError} from '../../../../lib/office-server.mjs';
import {buildInfinitumPath,getInfinitumPublicResource} from '../../../../lib/infinitum-public.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=20;
export async function GET(request){
 try{
  // Autenticação ANTES de ler dados do conector.
  await officeAuth(request);
  const token=process.env.INFINITUM_PUBLIC_TOKEN;
  if(!token)return officeJson({ok:true,configured:false,provider:'Infinitum Public API',message:'Conexão desativada até cadastrar novo token autorizado na Vercel.'});
  const q=new URL(request.url).searchParams,resource=q.get('resource')||'organizations';
  const params={organization_id:q.get('organization_id'),pop_id:q.get('pop_id'),phase_id:q.get('phase_id'),page:q.get('page'),limit:q.get('limit')};
  try{buildInfinitumPath(resource,params)}catch(e){return officeJson({ok:false,error:e.message},400)}
  const data=await getInfinitumPublicResource({token,resource,params});
  return officeJson({ok:true,configured:true,resource,data,readOnly:true});
 }catch(e){
  // Nunca inclua segredo ou payload de upstream no erro devolvido ao navegador.
  if(e?.status===401||e?.status===403||e?.status===429)return officeJson({ok:false,error:'Acesso à API Infinitum recusado ou limitado (HTTP '+e.status+').'},e.status);
  return safeOfficeError(e);
 }
}
