import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
export async function POST(request){try{const {user}=await officeAuth(request);const data=await request.json();
 const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 return officeJson(await waAutoOperation('send',user.id,{...data,to:data.to||data.phone,message:data.message||data.text},process.env,fetch,jwt));
 }catch(e){return safeOfficeError(e)}}
