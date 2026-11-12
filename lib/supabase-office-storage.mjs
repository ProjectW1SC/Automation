// Supabase Auth: localStorage só quando "Lembrar de mim" estiver marcado.
// Para a opção desmarcada, os tokens ficam em sessionStorage, descartados quando a sessão do navegador termina.
const MODE='projectw1sc:remember';
export function setRememberOfficeSession(remember,env=typeof window==='undefined'?null:window){
 if(!env)return;
 try{env.localStorage.setItem(MODE,remember?'1':'0')}catch{}
}
export function getRememberOfficeSession(env=typeof window==='undefined'?null:window){
 if(!env)return true;
 try{return env.localStorage.getItem(MODE)!=='0'}catch{return true}
}
export function createOfficeAuthStorage(env=typeof window==='undefined'?null:window){
 const pick=()=>getRememberOfficeSession(env)?env?.localStorage:env?.sessionStorage;
 return {
  getItem(key){try{return pick()?.getItem(key)||null}catch{return null}},
  setItem(key,value){
   try{pick()?.setItem(key,value);
    const other=getRememberOfficeSession(env)?env?.sessionStorage:env?.localStorage;
    other?.removeItem(key)}catch{}
  },
  removeItem(key){
   try{env?.localStorage?.removeItem(key);env?.sessionStorage?.removeItem(key)}catch{}
  }
 };
}
