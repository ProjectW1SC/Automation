// Evita interfaces presas permanentemente quando o SDK de auth mantém um Web Lock.
// O timeout termina apenas a espera de UI; não cancela ou autoriza autenticação.
export function withAuthDeadline(promise,ms=9000){
 if(!Number.isFinite(ms)||ms<1)throw new TypeError('Prazo de autenticação inválido.');
 let timeout;
 return Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>{timeout=setTimeout(()=>{
    const error=new Error('A autenticação não respondeu. Tente novamente ou reinicie a sessão local.');
    error.code='AUTH_TIMEOUT';reject(error);
  },ms)})
 ]).finally(()=>clearTimeout(timeout));
}
