// Ponte server-side para WA.Auto (Baileys). Não usa a API oficial da Meta.
const DEFAULT_BASE = 'https://wa-auto-cloud.onrender.com';
const ACTIONS=Object.freeze({status:['GET','status'],chats:['GET','chats'],messages:['GET','messages'],connect:['POST','connect'],pair:['POST','pair'],logout:['POST','logout'],send:['POST','send']});
function invalid(message,status=400){return Object.assign(new Error(message),{status})}
export function bridgeConfig(env=process.env){
 const base=String(env.WA_AUTO_URL||env.WA_AUTO_BASE_URL||DEFAULT_BASE).trim().replace(/\/$/,'');
 const token=String(env.WA_AUTO_TOKEN||env.WA_INTEGRATION_TOKEN||'').trim();
 let url=null;
 try{url=new URL(base)}catch{return {configured:false,baseUrl:null,token:'',reason:'URL WA.Auto inválida'}}
 const hostname=url.hostname.toLowerCase();
 const local=hostname==='localhost'||hostname.endsWith('.localhost')||hostname==='[::1]'||/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||local) return {configured:false,baseUrl:null,token:'',reason:'WA.Auto exige endpoint HTTPS público seguro'};
 return {configured:Boolean(token),baseUrl:url.origin+url.pathname.replace(/\/$/,''),token,reason:token?'':'Credencial WA_AUTO_TOKEN não configurada no servidor'};
}
function paramsFor(action,p={}){
 switch(action){
  case 'chats':return new URLSearchParams({limit:String(Math.min(Math.max(Number(p.limit)||80,1),100)),page:'0',q:String(p.q||'').slice(0,80),onlyGroups:p.onlyGroups==='1'?'1':'0'});
  case 'messages':{
   const jid=String(p.jid||'').trim();
   if(!jid||jid.length>200||!/@(?:s\.whatsapp\.net|g\.us|lid|c\.us)$/.test(jid))throw invalid('Selecione uma conversa válida.');
   return new URLSearchParams({jid,limit:String(Math.min(Math.max(Number(p.limit)||80,1),100))});
  }
  default:return null;
 }
}
function bodyFor(action,p={}){
 switch(action){
  case 'send':{
   if(p.approved!==true)throw invalid('Confirme o envio manualmente.');
   const to=String(p.to||'').trim(),message=String(p.message||'').trim();
   const digits=to.replace(/\D/g,'');
   if(!(/^\d{10,15}$/.test(digits)||/^\d{8,22}@g\.us$/.test(to)))throw invalid('Número ou grupo WhatsApp inválido.');
   if(!message||message.length>3000)throw invalid('Mensagem deve ter de 1 a 3000 caracteres.');
   return {to,message};
  }
  case 'pair':{
   const phone=String(p.phone||'').replace(/\D/g,'');
   if(!/^\d{10,15}$/.test(phone))throw invalid('Informe telefone com DDD para pareamento.');
   return {phone};
  }
  default:return {};
 }
}
export async function waAutoOperation(action,actorId,params={},env=process.env,requestFetch=fetch){
 if(!Object.hasOwn(ACTIONS,action))throw invalid('Ação WhatsApp não permitida.');
 if(typeof actorId!=='string'||!/^[0-9a-f-]{36}$/i.test(actorId))throw invalid('Usuário autorizado não identificado.',403);
 const cfg=bridgeConfig(env);
 if(!cfg.configured){
  if(action==='status')return {ok:true,provider:'WA.Auto / Baileys',configured:false,connected:false,connection:{status:'unconfigured'},message:cfg.reason};
  throw invalid('WA.Auto ainda não configurado no Vercel. Cadastre WA_AUTO_TOKEN no servidor.',503);
 }
 const [method,path]=ACTIONS[action],query=method==='GET'?paramsFor(action,params):null;
 const validatedBody=method==='POST'?bodyFor(action,params):null;
 const url=cfg.baseUrl+'/api/integrations/lexispredict/'+path+(query?'?'+query.toString():'');
 let response;
 try{
  response=await requestFetch(url,{method,redirect:'error',cache:'no-store',
   headers:{Authorization:'Bearer '+cfg.token,'x-wa-integration-token':cfg.token,'x-lexis-user-id':actorId,Accept:'application/json','Content-Type':'application/json'},
   ...(method==='POST'?{body:JSON.stringify(validatedBody)}:{}),signal:AbortSignal.timeout(50000)});
 }catch(e){throw invalid('WA.Auto não respondeu. Confira se o serviço cloud está ligado.',503)}
 const raw=await response.text();
 if(raw.length>950000||!raw.trim().startsWith('{'))throw invalid('WA.Auto retornou resposta não verificável.',502);
 let result;try{result=JSON.parse(raw)}catch{throw invalid('WA.Auto retornou JSON inválido.',502)}
 if(!response.ok||result?.ok===false){
  const status=[400,401,403,404,409,429].includes(response.status)?response.status:503;
  throw invalid('WA.Auto: '+String(result?.error||result?.message||'HTTP '+response.status).slice(0,170),status);
 }
 if(action==='status'){
  const connection=result?.connection||{status:'offline'};
  return {ok:true,configured:true,provider:'WA.Auto / Baileys',connected:connection.status==='ready',connection,memory:result?.memory||null};
 }
 if(action==='send')return {ok:true,provider:'WA.Auto',accepted:true,delivered:false,messageId:result?.messageId||result?.id||null,notice:'WA.Auto aceitou o envio. Entrega e leitura exigem confirmação independente.'};
 return {...result,configured:true,provider:'WA.Auto / Baileys'};
}
