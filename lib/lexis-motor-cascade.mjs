// LexisPredict-style cascade. Only server-configured and user-authorized engines run.
const specs=[
 ['colibri','COLIBRI_API_KEY','COLIBRI_BASE_URL','COLIBRI_MODEL',''],
 ['minicpm','MINICPM_API_KEY','MINICPM_BASE_URL','MINICPM_MODEL',''],
 ['minimax','MINIMAX_API_KEY','MINIMAX_BASE_URL','MINIMAX_MODEL','https://api.minimax.io/v1/chat/completions'],
 ['claude','ANTHROPIC_API_KEY','ANTHROPIC_BASE_URL','ANTHROPIC_MODEL','https://api.anthropic.com/v1/messages'],
 ['groq','GROQ_API_KEY','GROQ_BASE_URL','GROQ_MODEL','https://api.groq.com/openai/v1/chat/completions'],
 ['xai','XAI_GROK_PRESTIGE_API_KEY','XAI_BASE_URL','XAI_MODEL','https://api.x.ai/v1/chat/completions'],
 ['openrouter','OPENROUTER_API_KEY','OPENROUTER_BASE_URL','BLACKHOLE_AI_MODEL','https://openrouter.ai/api/v1/chat/completions'],
 ['gemini','GEMINI_API_KEY','GEMINI_BASE_URL','GEMINI_MODEL','https://generativelanguage.googleapis.com/v1beta/openai/chat/completions']
];
function allowedUrl(raw,id){try{
 const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)return false;
 const h=u.hostname.toLowerCase();
 if(/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)||h.endsWith('.local')||h.endsWith('.internal'))return false;
 if(id==='colibri'||id==='minicpm')return h.endsWith('.w1capital.com.br');
 const domains={minimax:'api.minimax.io',claude:'api.anthropic.com',groq:'api.groq.com',xai:'api.x.ai',openrouter:'openrouter.ai',gemini:'generativelanguage.googleapis.com'};
 return h===domains[id]&&(id==='claude'?u.pathname.endsWith('/messages'):u.pathname.endsWith('/chat/completions'));
 }catch{return false}
}
export function configuredLexisMotors(env={}){
 return specs.flatMap(([id,keyName,urlName,modelName,defaultUrl])=>{
  const key=String(env[keyName]||'').trim(),endpoint=String(env[urlName]||defaultUrl||'').trim();
  let model=String(env[modelName]||'').trim();
  if(id==='openrouter')model=model||String(env.LEGAL_AI_MODEL||'openrouter/free');
  return key&&endpoint&&model&&allowedUrl(endpoint,id)?[{id,model,key,endpoint}]:[];
 });
}
function messagesFor(messages){
 return [{role:'system',content:'Assistente jurídico Infinitum integrado ao LexisPredict. Não invente leis, fatos, processos, fontes, decisões ou consultas. Marque lacunas e somente rascunhos para revisão. Nenhuma ação externa deve ser executada.'},
 ...(Array.isArray(messages)?messages:[]).slice(-9).filter(x=>['user','assistant'].includes(x?.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,3400)}))];
}
export async function runLexisCascade(messages,{motors=[],allowFallback=false,fetchImpl=fetch}={}){
 const permitted=motors.slice(0,allowFallback?8:1);
 if(!permitted.length)throw Error('Nenhum motor remoto com credenciais configuradas.');
 let last;
 for(const motor of permitted){
  try{
   const anthropic=motor.id==='claude',msg=messagesFor(messages);
   const res=await fetchImpl(motor.endpoint,{method:'POST',cache:'no-store',redirect:'error',
    headers:{'Content-Type':'application/json',Accept:'application/json',...(anthropic?{'x-api-key':motor.key,'anthropic-version':'2023-06-01'}:{Authorization:'Bearer '+motor.key})},
    body:JSON.stringify(anthropic?{model:motor.model,max_tokens:1400,system:msg[0].content,messages:msg.slice(1)}:{model:motor.model,max_tokens:1400,temperature:0.2,messages:msg}),
    signal:AbortSignal.timeout(17000)});
   if(!res.ok){const e=Error('Motor '+motor.id+' respondeu HTTP '+res.status);e.status=res.status;throw e}
   const raw=await res.text();if(raw.length>350000)throw Error('Resposta grande demais');
   const data=JSON.parse(raw);
   const reply=anthropic?data?.content?.find(x=>x.type==='text')?.text:data?.choices?.[0]?.message?.content;
   if(typeof reply!=='string'||!reply.trim())throw Error('Resposta vazia ou incompatível');
   return {reply:reply.trim().slice(0,10000),model:motor.model,engine:motor.id};
  }catch(e){
   last=Error('Motor '+motor.id+' indisponível: '+String(e.message||'falha').slice(0,130));
   const status=Number(e.status)||0;
   if(!allowFallback||(status>=400&&status<500&&status!==429))break;
  }
 }
 throw last||Error('Nenhum motor respondeu');
}
