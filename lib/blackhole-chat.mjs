// Motor leve e roteamento da conversa BLACKHOLE. Nunca finge ser um LLM quando falta chave.
const cleanup=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000e-\u001f]/g,'').trim();
export function validateBlackholePrompt(value){
 if(typeof value!=='string'||!cleanup(value))throw new Error('Escreva uma mensagem para o BLACKHOLE.');
 if(value.length>3500)throw new Error('A mensagem deve ter no máximo 3.500 caracteres.');
 return cleanup(value);
}
export function offlineBlackholeReply(input,{review=null}={}){
 const p=validateBlackholePrompt(input),t=p.toLocaleLowerCase('pt-BR');
 if(/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|eai|e aí|hello|hi)[!?.\s]*$/.test(t))
  return 'Olá! Sou o BLACKHOLE. Posso ajudar a organizar processos, preparar roteiros de peças, analisar registros cadastrados e montar rascunhos para revisão. Escreva sua solicitação.';
 if(/^(obrigad[oa]|valeu|thanks|ok|beleza)[!?.\s]*$/.test(t))return 'Por nada. Pode enviar sua próxima solicitação.';
 if(/^(ajuda|help|o que você faz|quais suas funções|como funciona)[!?.\s?]*$/.test(t))
  return 'BLACKHOLE — funções locais: revisar informações registradas na carteira, organizar conferência de prazos e processos, propor estrutura de peças e consultar os resultados oficiais já armazenados. Para conversas generativas livres, configure um provedor de IA autorizado.';
 if(review?.stats?.storedChecks>0||review?.stats?.processes>0&&/processo|audi[eê]ncia|djen|datajud|relat[oó]rio/i.test(t)){
  return String(review.answer||'').trim()||'Há registros disponíveis, mas não foi possível compor a análise.';
 }
 if(/peça|peti[cç][aã]o|contest[aã]o|recurso|manifesta[cç][aã]o/i.test(t)){
  return 'Para elaborar uma peça: informe os fatos dos autos, a fase processual, o pedido pretendido e as provas disponíveis. Acesse Peças e petições, selecione o processo e gere uma minuta editável. Sem decisões e documentos confirmados, não acrescentarei fundamentos como se estivessem comprovados.';
 }
 if(/djen|datajud|comunica|pje|tribunal|processo|senten[cç]a|audi[eê]ncia/i.test(t)){
  return 'Posso orientar a conferência judicial. O DataJud disponibiliza metadados e movimentações; o DJEN/Comunica PJe disponibiliza publicações. Um bloqueio 403 não comprova ausência de registros. Informe o CNJ e consulte as fontes na aba Processos; não posso presumir conteúdo de decisão não acessada.';
 }
 if(/whatsapp|cliente|responder|atendimento/i.test(t)){
  return 'Posso ajudar a preparar uma resposta para revisão, mas preciso do texto recebido e do andamento confirmado. O BLACKHOLE não envia mensagens externas automaticamente. A aba WhatsApp oferece registros e, quando configurada, o envio autorizado.';
 }
 return 'Recebi sua mensagem: “'+p.slice(0,220)+'”. Nesta instalação, o modo leve responde a tarefas jurídicas baseadas em evidências. Para uma resposta generativa livre sobre qualquer assunto, é necessário ativar um modelo remoto autorizado (por exemplo, um modelo gratuito disponível no OpenRouter). Nenhuma consulta externa foi realizada.';
}
export function configuredBlackholeProvider(env={}){
 const key=env.BLACKHOLE_AI_API_KEY||env.OPENROUTER_API_KEY||env.LEGAL_AI_API_KEY;
 const base=env.BLACKHOLE_AI_BASE_URL||env.LEGAL_AI_BASE_URL||(env.OPENROUTER_API_KEY?'https://openrouter.ai/api/v1/chat/completions':'');
 const model=env.BLACKHOLE_AI_MODEL||env.LEGAL_AI_MODEL||(env.OPENROUTER_API_KEY?'openrouter/free':'');
 if(!key||!base||!model)return null;
 let endpoint;try{endpoint=new URL(base)}catch{return null}
 const hosts=['openrouter.ai','api.groq.com','api.deepseek.com','api.x.ai','api.mistral.ai','api.together.xyz','api.fireworks.ai'];
 if(endpoint.protocol!=='https:'||!hosts.includes(endpoint.hostname)||!endpoint.pathname.endsWith('/chat/completions'))return null;
 return {key,endpoint:endpoint.toString(),model};
}
export async function generativeBlackholeReply(provider,messages,fetchImpl=fetch){
 if(!provider?.key||!provider?.endpoint||!provider?.model)throw new Error('Modelo externo não configurado.');
 const finalMessages=[{role:'system',content:'Você é BLACKHOLE, um assistente jurídico brasileiro de apoio à advocacia. Responda naturalmente e com clareza a mensagens de qualquer assunto, sem inventar fatos sobre processos. Quando usar registros jurídicos, só considere dados explicitamente enviados. Não execute ações externas nem afirme que houve consulta judicial ou protocolo. Responda em português brasileiro quando o usuário usar português.'},...messages.slice(-10).filter(x=>['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,3500)}))];
 const res=await fetchImpl(provider.endpoint,{method:'POST',headers:{Authorization:'Bearer '+provider.key,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({model:provider.model,messages:finalMessages,temperature:0.35,max_tokens:1250}),
  signal:AbortSignal.timeout(17000),cache:'no-store',redirect:'error'});
 if(!res.ok)throw new Error(res.status===429?'Modelo gratuito temporariamente limitado.':'Provedor de IA respondeu com HTTP '+res.status+'.');
 const text=await res.text();if(text.length>350000)throw new Error('Resposta do provedor excedeu o limite.');
 const obj=JSON.parse(text),content=obj?.choices?.[0]?.message?.content;
 if(typeof content!=='string'||!content.trim())throw new Error('O provedor não retornou texto válido.');
 return content.trim().slice(0,10000);
}
