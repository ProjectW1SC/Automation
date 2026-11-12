import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 try{
  await officeAuth(request);
  const missing=['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN','WHATSAPP_APP_SECRET','SUPABASE_SERVICE_ROLE_KEY'].filter(k=>!process.env[k]);
  return officeJson({ok:true,configured:missing.length===0,missing,provider:'Meta WhatsApp Business Cloud API',mode:'manual-review'});
 }catch(e){return safeOfficeError(e)}
}
