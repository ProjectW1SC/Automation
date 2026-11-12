import {officeAuth,officeJson,safeOfficeError} from '../../../../../../lib/office-server.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function POST(request){
 try{
  const {user}=await officeAuth(request);
  const base=String(process.env.BLACKHOLE_WA_WORKER_URL||'').trim().replace(/\/+$/,'');
  const token=String(process.env.BLACKHOLE_WA_BRIDGE_TOKEN||'').trim();
  if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base)||!/^[a-f0-9]{64}$/i.test(token))
   throw Object.assign(Error('Worker de WhatsApp QR não configurado.'),{status:503});
  const response=await fetch(base+'/api/connect',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({owner_id:user.id}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(55000)});
  const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Object.assign(Error('Worker não retornou resposta válida.'),{status:502})}
  if(!response.ok||!data.ok)throw Object.assign(Error(data.error||'Não foi possível iniciar o WhatsApp.'),{status:response.status===429?429:503});
  return officeJson({ok:true,configured:true,...data},202);
 }catch(e){return safeOfficeError(e)}
}
