import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {buildSuperAgentReview,targetCNJ} from '../../../lib/superagent-core.mjs';
import {formatProcessNumber} from '../../../lib/processos-oficiais.mjs';
import {configuredLexisMotors,runLexisCascade} from '../../../lib/lexis-motor-cascade.mjs';
import {predictLmConfig,runPredictLmChat} from '../../../lib/predictlm-gateway.mjs';
import {qualityGate} from '../../../lib/lexis-predictlm-quality.mjs';
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
  const predictlm=body?.allowEngineFallback===true?predictLmConfig(process.env):null;
  const preferredMotor=['auto','colibri','minicpm','minimax','claude','groq','xai','openrouter','gemini','predictlm']
   .includes(body?.preferredMotor)?body.preferredMotor:'auto';
  // Provedores recebem somente a mensagem/histórico fornecidos explicitamente.
  // Carteira, snapshots, números e nomes não são enviados por esta rota.
  if((provider||cascaded.length||predictlm)&&body?.externalAiConsent===true){
   try{
    const history=Array.isArray(body?.messages)?body.messages.slice(-8):[];
    const messages=[...history,{role:'user',content:prompt}];
    let answer;
    if(preferredMotor==='predictlm'){
     if(!predictlm)throw Error('PredictLM não configurado com host e chave privada do servidor.');
     answer=await runPredictLmChat(messages,{config:predictlm});
    }else if(cascaded.length){
     const ordered=preferredMotor==='auto'?cascaded:[
      ...cascaded.filter(m=>m.id===preferredMotor),
      ...cascaded.filter(m=>m.id!==preferredMotor)
     ];
     if(preferredMotor!=='auto'&&!cascaded.some(m=>m.id===preferredMotor))
      throw Error('Motor '+preferredMotor+' não configurado no servidor.');
     try{answer=await runLexisCascade(messages,{motors:ordered,allowFallback:true});}
     catch(e){
      if(!predictlm||preferredMotor!=='auto')throw e;
      answer=await runPredictLmChat(messages,{config:predictlm});
     }
    }else if(predictlm){
     answer=await runPredictLmChat(messages,{config:predictlm});
    }else{
     answer={reply:await generativeBlackholeReply(provider,messages),model:provider.model,engine:'motor-online'};
    }
    const gate=qualityGate(answer.reply);
    if(!gate.ok)throw Error('Resposta do modelo bloqueada por inconsistência; revisão necessária.');
    return json({ok:true,reply:gate.text,model:answer.model,engine:answer.engine,
     isGenerativeModel:true,notice:'Motor utilizado: '+answer.engine+'. Confira fundamentos jurídicos e fontes antes de agir.'});
   }catch(e){
    const fallback=offlineBlackholeReply(prompt);
    return json({ok:true,reply:fallback,model:'regras-locais',isGenerativeModel:false,
     notice:'O motor remoto não concluiu: '+String(e.message||'indisponível').slice(0,160)+
      '. Foi usado o modo local; nenhuma consulta judicial ou ação externa foi simulada.'});
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
