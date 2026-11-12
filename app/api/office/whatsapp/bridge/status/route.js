import {officeAuth,officeJson,safeOfficeError} from '../../../../../../lib/office-server.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
function config(){
 const base=String(process.env.BLACKHOLE_WA_WORKER_URL||'').trim().replace(/\/+$/,'');
 const token=String(process.env.BLACKHOLE_WA_BRIDGE_TOKEN||'').trim();
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base)||!/^[a-f0-9]{64}$/i.test(token))return null;
 return {base,token};
}
async function requestWorker(path,method='GET',body){
 const c=config();if(!c)throw Object.assign(Error('Worker de WhatsApp QR ainda não configurado.'),{status:503});
 const response=await fetch(c.base+path,{method,headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
 const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{throw Object.assign(Error('O serviço de WhatsApp não retornou resposta válida.'),{status:502})}
 if(!response.ok||data.ok===false)throw Object.assign(Error(data.error||'Serviço de WhatsApp indisponível.'),{status:response.status===429?429:503});
 return data;
}
export async function GET(request){
 try{
  await officeAuth(request);
  if(!config())return officeJson({ok:true,configured:false,connected:false,status:'unconfigured',qr:null,notice:'Worker de WhatsApp ainda não configurado.'});
  const data=await requestWorker('/api/status');
  return officeJson({ok:true,configured:true,...data});
 }catch(e){return safeOfficeError(e)}
}
export async function POST(request){
 try{
  const {user}=await officeAuth(request);
  const data=await requestWorker('/api/connect','POST',{owner_id:user.id});
  return officeJson({ok:true,configured:true,...data},202);
 }catch(e){return safeOfficeError(e)}
}
