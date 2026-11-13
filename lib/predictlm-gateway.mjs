import {qualityGate} from './lexis-predictlm-quality.mjs';
// Real API contract from W2CAPITAL/PredictLm /api/chat and
// W2CAPITAL/SheetsPredict /api/predict-studio: Bearer client key, POST prompt/messages.
// Only enabled when a trusted HTTPS host AND dedicated server key are configured.
export function predictLmConfig(env={}){
 const raw=String(env.PREDICTLM_URL||'').trim();
 const secret=String(env.PREDICTLM_API_KEY||'').trim();
 const trusted=String(env.PREDICTLM_TRUSTED_HOST||'').trim().toLowerCase();
 if(!raw||!secret||!trusted)return null;
 try{
  const base=new URL(raw),host=base.hostname.toLowerCase();
  if(base.protocol!=='https:'||host!==trusted||base.username||base.password||base.port||
    base.search||base.hash||!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)||
    host.endsWith('.local')||host.endsWith('.internal')||host==='localhost'||
    /(?:^|\.)(?:localhost|127|169|192|10)$/.test(host))return null;
  if(base.pathname!=='/'&&base.pathname!=='')return null;
  return {url:base.origin+'/api/chat',key:secret};
 }catch{return null}
}
export async function runPredictLmChat(messages,{config,fetchImpl=fetch,timeoutMs=14000}={}){
 if(!config?.url||!config?.key)throw Error('PredictLM não configurado no servidor.');
 const list=(Array.isArray(messages)?messages:[]).filter(x=>x&&
  ['user','assistant'].includes(x.role)&&typeof x.content==='string'&&x.content.trim())
  .slice(-9).map(x=>({role:x.role,content:x.content.trim().slice(0,3400)}));
 const prompt=[...list].reverse().find(x=>x.role==='user')?.content;
 if(!prompt)throw Error('PredictLM exige uma pergunta válida.');
 const req={prompt,messages:list.slice(0,-1),useHistory:true,language:'pt-BR',deep:false,surface:'chat'};
 const response=await fetchImpl(config.url,{method:'POST',cache:'no-store',redirect:'error',
  headers:{'Content-Type':'application/json',Accept:'application/json',Authorization:'Bearer '+config.key},
  body:JSON.stringify(req),signal:AbortSignal.timeout(Math.max(2000,Math.min(18000,timeoutMs)))});
 if(!response?.ok)throw Error('PredictLM indisponível (HTTP '+(Number(response?.status)||502)+').');
 const data=await response.json();
 const gate=qualityGate(data?.content);
 if(!gate.ok)throw Error('PredictLM retornou resposta incompatível com a qualidade mínima.');
 return {reply:gate.text.slice(0,12000),model:String(data?.model||'PredictLM').slice(0,120),
  engine:'predictlm',provider:String(data?.provider||'PredictLM').slice(0,80)};
}
