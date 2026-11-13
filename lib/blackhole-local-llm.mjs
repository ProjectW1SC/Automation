'use client';
// Inferência isolada: nenhuma requisição judicial nem dado da carteira é enviado ao worker.
// Os pesos do Qwen são obtidos sob solicitação e permanecem no cache do próprio navegador.
let worker=null;let active=null;let serial=0;
export function stopBlackholeQwen(){
 if(active){active.cancel();active=null}
 if(worker){worker.terminate();worker=null}
}
// Verificação anterior à seleção: a presença de navigator.gpu não garante adaptador.
export async function checkBlackholeQwenSupport(){
 if(typeof window==='undefined'||typeof Worker==='undefined'||typeof navigator==='undefined')
  return {ok:false,reason:'Este navegador não oferece os recursos necessários ao Qwen local.'};
 const memory=Number(navigator.deviceMemory||0);
 if(memory>0&&memory<8)
  return {ok:false,reason:'O navegador informa menos de 8 GB de RAM. O Qwen local foi desativado para evitar travamentos.'};
 if(!navigator.gpu?.requestAdapter)
  return {ok:false,reason:'WebGPU indisponível neste navegador. O Qwen não será executado na CPU.'};
 try{
  const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});
  if(!adapter)return {ok:false,reason:'Nenhum adaptador WebGPU compatível foi encontrado. O Qwen não será executado na CPU.'};
 }catch{return {ok:false,reason:'Não foi possível inicializar WebGPU neste navegador.'};}
 return {ok:true,reason:''};
}
export async function runBlackholeQwen(prompt,history=[],onProgress=()=>{},{consent=false,timeoutMs=480000}={}){
 if(!consent)throw Error('Confirme o download local do Qwen antes de iniciar.');
 if(active)throw Error('Já existe uma resposta local em andamento.');
 const support=await checkBlackholeQwenSupport();
 if(!support.ok)throw Error(support.reason);
 if(document.visibilityState==='hidden')throw Error('Abra a aba do BLACKHOLE antes de usar Qwen local.');
 if(!worker)worker=new Worker('/workers/blackhole-qwen-0.5b.worker.mjs',{type:'module',name:'blackhole-qwen-0.5b'});
 const current=worker,id=++serial;
 return new Promise((resolve,reject)=>{
  let deadline;
  const cleanup=()=>{
   if(active?.id===id)active=null;
   current.removeEventListener('message',receive);
   current.removeEventListener('error',error);
   clearTimeout(deadline);
  };
  const receive=e=>{
   if(e.data?.requestId!==id)return;
   const d=e.data;
   onProgress({status:d.status,message:d.message,progress:d.progress,file:d.file});
   if(d.status==='complete'){cleanup();resolve({reply:String(d.text||''),model:d.model||'Qwen 0.5B',local:true})}
   if(d.status==='error'){cleanup();reject(Error(d.error||'Modelo local indisponível.'))}
  };
  const error=()=>{cleanup();if(worker){worker.terminate();worker=null}reject(Error('Falha de inicialização do Qwen local; altere para IA gratuita online.'))};
  deadline=setTimeout(()=>{cleanup();if(worker){worker.terminate();worker=null}reject(Error('Qwen não concluiu a inicialização dentro do limite.'))},Math.max(30000,Math.min(480000,timeoutMs)));
  active={id,cancel:()=>{cleanup();reject(Error('Geração local cancelada.'))}};
  current.addEventListener('message',receive);
  current.addEventListener('error',error);
  current.postMessage({requestId:id,prompt:String(prompt||'').slice(0,1500),history:history.slice(-2),maxTokens:96,requireWebGpu:true});
 });
}
