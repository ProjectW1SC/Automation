import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {waAutoOperation} from '../../../../../lib/wa-auto-bridge.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){try{const {user}=await officeAuth(request);const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();return officeJson(await waAutoOperation('status',user.id,{},process.env,fetch,jwt));}catch(e){return safeOfficeError(e)}}
