import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
export async function GET(request){
 try{const {user}=await officeAuth(request);const q=new URL(request.url).searchParams;
 const action=q.get('action')||'status';
 return officeJson(await waAutoOperation(action,user.id,{q:q.get('q'),jid:q.get('jid'),onlyGroups:q.get('onlyGroups'),limit:q.get('limit')}));
 }catch(e){return safeOfficeError(e)}
}
export async function POST(request){
 try{const {user}=await officeAuth(request);const data=await request.json();
 return officeJson(await waAutoOperation(String(data?.action||''),user.id,data));
 }catch(e){return safeOfficeError(e)}
}
