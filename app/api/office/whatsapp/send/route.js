import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
import {isDemoUserCompany} from '../../../../../lib/demo-tenant.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
export async function POST(request){try{const {user,db}=await officeAuth(request);if(await isDemoUserCompany(db,user.id))return officeJson({ok:false,demo:true,error:'Envio externo desativado na demonstração.'},403);const data=await request.json();
 const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 return officeJson(await waAutoOperation('send',user.id,{...data,to:data.to||data.phone,message:data.message||data.text},process.env,fetch,jwt));
 }catch(e){return safeOfficeError(e)}}
