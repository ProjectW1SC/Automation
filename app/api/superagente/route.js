import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {buildSuperAgentReview,targetCNJ} from '../../../lib/superagent-core.mjs';
import {formatProcessNumber} from '../../../lib/processos-oficiais.mjs';
import {configuredLexisMotors,runLexisCascade} from '../../../lib/lexis-motor-cascade.mjs';
import {validateBlackholePrompt,offlineBlackholeReply,configuredBlackholeProvider,generativeBlackholeReply,requiresPortfolio} from '../../../lib/blackhole-chat.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store,private'}});
export async function POST(request){
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({ok:false,error:'Faça login no CRM.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({ok:false,error:'Conexão Supabase indisponível.'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user||!await checkCrmAccess(db,user))return json({ok:false,error:'Conta sem acesso à carteira.'},403);
  const body=await request.json();
  let prompt;try{prompt=validateBlackholePrompt(body?.prompt)}catch(e){return json({ok:false,error:e.message},400)}
  const provider=configuredBlackholeProvider(process.env);
  const cascaded=body?.allowEngineFallback===true?configuredLexisMotors(process.env):[];
  // A conversa generativa nunca recebe dados de processos sem consentimento expresso.
  if((provider||cascaded.length)&&body?.externalAiConsent===true){
   try{
    const history=Array.isArray(body?.messages)?body.messages.slice(-8):[];
    const answer=cascaded.length?await runLexisCascade([...history,{role:'user',content:prompt}],{motors:cascaded,allowFallback:true}):
     {reply:await generativeBlackholeReply(provider,[...history,{role:'user',content:prompt}]),model:provider.model,engine:'motor-online'};
    return json({ok:true,reply:answer.reply,model:answer.model,engine:answer.engine,isGenerativeModel:true,notice:'Motor utilizado: '+answer.engine+'. Provedores adicionais '+(cascaded.length?'autorizados':'desativados')+'. Confira afirmações jurídicas.'});
   }catch(e){
    // Em falha de rede/limite, mantém a conversa utilizável com aviso explícito.
    // Não envia a mensagem a outro provedor sem uma nova autorização.
    const fallback=offlineBlackholeReply(prompt);
    return json({ok:true,reply:fallback,model:'regras-locais',isGenerativeModel:false,notice:'Modelo remoto não respondeu: '+e.message+' Foi usado o modo local, sem afirmar inferência generativa.'});
   }
  }
  if(!requiresPortfolio(prompt))return json({ok:true,reply:offlineBlackholeReply(prompt),model:'regras-locais',isGenerativeModel:false,notice:'Resposta local. Nenhuma fonte judicial foi consultada.'});
  const number=targetCNJ(prompt),formatted=number?formatProcessNumber(number):null;
  let processQ=db.from('office_cases').select('id,process_number,title,subject,status,client_id').limit(formatted?5:250);
  if(formatted)processQ=processQ.eq('process_number',formatted);
  const [p,c,l]=await Promise.all([
   processQ,db.from('office_clients').select('id').limit(100),
   db.from('crm_leads').select('id').limit(100)
  ]);
  const errors=[p,c,l].filter(x=>x.error).map(x=>x.error.message);
  // Erro parcial de leitura não é sinônimo de carteira vazia. Para conversa simples,
  // ainda devolve uma resposta transparente sem prender o usuário.
  if(errors.length){
   return json({ok:true,reply:offlineBlackholeReply(prompt),model:'regras-locais',isGenerativeModel:false,
    notice:'Não foi possível ler todos os registros; nenhuma informação da carteira foi presumida.'});
  }
  const allowedNumbers=[...new Set((p.data||[]).map(x=>x.process_number).filter(Boolean))];
  const snaps=allowedNumbers.length?await db.from('crm_judicial_snapshots')
   .select('process_number,source,checked_at,payload')
   .in('process_number',allowedNumbers.slice(0,200)).order('checked_at',{ascending:false}).limit(200):
   {data:[],error:null};
  if(snaps.error)return json({ok:true,reply:offlineBlackholeReply(prompt),model:'regras-locais',isGenerativeModel:false,notice:'Histórico judicial indisponível. Nenhuma consulta foi presumida.'});
  const review=buildSuperAgentReview(prompt,{processes:p.data||[],snapshots:snaps.data||[],clients:c.data||[],leads:l.data||[]});
  return json({ok:true,reply:offlineBlackholeReply(prompt,{review}),review,model:'motor-de-evidencias',isGenerativeModel:false,
   notice:provider?'Modelo externo não utilizado porque não houve consentimento de envio.':'Modelo generativo não configurado; resposta do motor local verificável. Nenhuma ação externa foi executada.'});
 }catch(e){return json({ok:false,error:e.message||'Falha do superagente.'},502)}
}
