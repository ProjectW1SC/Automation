'use client';
// Inferência isolada: nenhuma requisição judicial nem dado da carteira é enviado ao worker.
// Os pesos do Qwen são obtidos sob solicitação e permanecem no cache do próprio navegador.
let worker=null;let active=null;let serial=0;
export function stopBlackholeQwen(){
 if(active){active.cancel();active=null}
 if(worker){worker.terminate();worker=null}
}
export async function runBlackholeQwen(prompt,history=[],onProgress=()=>{},{consent=false,timeoutMs=480000}={}){
 if(!consent)throw Error('Confirme o download local do Qwen antes de iniciar.');
 if(typeof window==='undefined'||typeof Worker==='undefined')throw Error('Seu navegador não suporta Web Workers.');
 if(active)throw Error('Já existe uma resposta local em andamento.');
 const memory=Number(navigator.deviceMemory||0);
 if(memory>0&&memory<8)throw Error('O navegador informa menos de 8 GB de RAM. Para evitar travamento, use IA gratuita online com sua autorização.');
 if(!('gpu' in navigator))throw Error('WebGPU indisponível. Não há execução por CPU para proteger computadores fracos; use IA online gratuita.');
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
