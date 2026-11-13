import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
import {isDemoUserCompany} from '../../../../../lib/demo-tenant.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
export async function GET(request){
 try{const {user,db}=await officeAuth(request);if(await isDemoUserCompany(db,user.id))return officeJson({ok:true,demo:true,connected:false,status:'demo',message:'Histórico de conversas inteiramente fictício.'});const q=new URL(request.url).searchParams;
 const action=q.get('action')||'status';
 const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 return officeJson(await waAutoOperation(action,user.id,{q:q.get('q'),jid:q.get('jid'),onlyGroups:q.get('onlyGroups'),limit:q.get('limit')},process.env,fetch,jwt));
 }catch(e){return safeOfficeError(e)}
}
export async function POST(request){
 try{const {user,db}=await officeAuth(request);if(await isDemoUserCompany(db,user.id))return officeJson({ok:false,demo:true,error:'Operações de WhatsApp externo desativadas na demonstração.'},403);const data=await request.json();
 const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 return officeJson(await waAutoOperation(String(data?.action||''),user.id,data,process.env,fetch,jwt));
 }catch(e){return safeOfficeError(e)}
}
