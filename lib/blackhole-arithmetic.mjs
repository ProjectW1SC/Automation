// Aritmética local determinística, sem eval, rede, modelos, arquivos ou efeitos colaterais.
// Não tenta simular que regras básicas sejam um LLM.
const format=n=>{
 if(!Number.isFinite(n)||Math.abs(n)>1e15)return null;
 const value=Number(n.toPrecision(14));
 return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:12,useGrouping:false}).format(value);
};
export function tryArithmetic(input){
 if(typeof input!=='string'||input.length>160)return null;
 let s=input.trim().replace(/^\s*(?:(?:quanto\s+(?:é|e|dá|da))|(?:calcule|calcula|resolver?|resolva)|(?:qual\s+(?:é|e)\s+o\s+resultado\s+de))\s*[:=]?\s*/i,'');
 s=s.replace(/[\s?!=]+$/,'').trim();
 if(s.length<3||s.length>100||!/^[\d\s,.()+\-*/×÷^]+$/.test(s))return null;
 const raw=s.replace(/×/g,'*').replace(/÷/g,'/').replace(/,/g,'.');
 if(!/\d\s*[-+*/^]\s*[\d(]/.test(raw)&&!/\)\s*[-+*/^]\s*\d/.test(raw))return null;
 const toks=raw.match(/(?:\d+(?:\.\d+)?|\.\d+|[()+\-*/^])/g);
 if(!toks||toks.join('')!==raw.replace(/\s/g,''))return null;
 let pos=0,steps=0;
 const peek=()=>toks[pos];
 const take=()=>{if(++steps>100)throw Error('expressão longa');return toks[pos++]};
 function factor(){
  if(peek()==='+'){take();return factor()}
  if(peek()==='-'){take();return -factor()}
  if(peek()==='('){take();const x=expression();if(take()!==')')throw Error('parêntese aberto');return x}
  const token=take();
  if(!token||!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token))throw Error('operando inválido');
  return Number(token);
 }
 function power(){
  const n=factor();if(peek()==='^'){take();const exp=power();if(Math.abs(exp)>12||Math.abs(n)>1e9)throw Error('potência excessiva');return n**exp}
  return n;
 }
 function term(){
  let x=power();
  while(peek()==='*'||peek()==='/'){const op=take(),y=power();if(op==='/'&&y===0)throw Error('divisão zero');x=op==='*'?x*y:x/y}
  return x;
 }
 function expression(){
  let x=term();while(peek()==='+'||peek()==='-'){const op=take(),y=term();x=op==='+'?x+y:x-y}
  return x;
 }
 try{
  const result=expression();if(pos!==toks.length)return null;
  const formatted=format(result);if(formatted===null)return null;
  const display=s.replace(/\s*([+\-*/×÷^()])\s*/g,'$1')
   .replace(/\*/g,' × ').replace(/\//g,' ÷ ').replace(/\+/g,' + ').replace(/([^\s])- /g,'$1 − ').replace(/\^/g,' ^ ');
  return display.replace(/\s+/g,' ').trim()+' = '+formatted;
 }catch{return null}
}
