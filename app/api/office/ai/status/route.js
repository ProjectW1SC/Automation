import {officeAuth,officeJson,safeOfficeError} from '../../../../../lib/office-server.mjs';
import {configuredBlackholeProvider} from '../../../../../lib/blackhole-chat.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request){
 try{
  await officeAuth(request);
  const model=configuredBlackholeProvider(process.env);
  return officeJson({ok:true,configured:!!model,model:model?.model||null,provider:model?'Provedor de IA autorizado':'indisponível',
   notice:model?'Chave presente no servidor. Este indicador não comprova crédito ou resposta até realizar geração.':'Nenhuma chave de IA está ativa.'});
 }catch(e){return safeOfficeError(e)}
}
