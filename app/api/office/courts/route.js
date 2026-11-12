import {officeAuth,officeJson,safeOfficeError} from '../../../../lib/office-server.mjs';
import {configuredCourtSources} from '../../../../lib/blackhole-court-links.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 try{
  await officeAuth(request);
  const items=configuredCourtSources(process.env);
  return officeJson({ok:true,items,count:items.length,
   notice:'Links oficiais públicos, originados de configurações autorizadas. Acesso ao portal não confirma pauta de processo específico.'});
 }catch(e){return safeOfficeError(e)}
}
