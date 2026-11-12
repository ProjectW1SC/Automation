/**
 * BLACKHOLE WA QR, single-organization worker. Requires Render/Node persistence;
 * never put sessions, QR challenges, API tokens or model secrets into the browser bundle.
 * Baileys is unofficial WhatsApp Web transport: linked-device restrictions apply.
 */
import http from 'node:http';
import {createCipheriv,createDecipheriv,randomBytes,timingSafeEqual} from 'node:crypto';
import {join,basename} from 'node:path';
import {mkdtemp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import makeWASocket,{useMultiFileAuthState,DisconnectReason,Browsers} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';

const TOKEN=String(process.env.BLACKHOLE_WA_BRIDGE_TOKEN||'').trim();
const KEY=String(process.env.BLACKHOLE_WA_VAULT_KEY||'').trim();
const VAULT=String(process.env.BLACKHOLE_WA_VAULT_URL||'').trim();
const PORT=Number(process.env.PORT||10000);
if(!/^[a-f0-9]{64}$/i.test(TOKEN)||!/^[a-f0-9]{64}$/i.test(KEY)||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/blackhole-wa-vault$/i.test(VAULT))
 throw Error('BLACKHOLE WhatsApp: credenciais privadas e cofre Supabase obrigatórios.');
const storageKey=Buffer.from(KEY,'hex');
const workspace=await mkdtemp(join(tmpdir(),'blackhole-wa-'));
const sessionDir=join(workspace,'state');
await mkdir(sessionDir,{recursive:true});
let current=null,connecting=null,ready=false,status='offline',qrData='',phone='',ownerId='',error='',lastSend=0,restored=false;
let flushTimer=null,flushing=false,restartTimer=null,backoff=0;
const recentIds=new Set();
const DDD=/^55\d{10,11}$/;
const logger=pino({level:'silent'});
function reply(res,statusCode,body){
 const out=JSON.stringify(body);
 res.writeHead(statusCode,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':Buffer.byteLength(out)});
 res.end(out);
}
function authorized(req){
 const candidate=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 return candidate.length===TOKEN.length&&timingSafeEqual(Buffer.from(candidate),Buffer.from(TOKEN));
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function vault(method,body){
 const response=await fetch(VAULT,{method,headers:{'Content-Type':'application/json','x-blackhole-wa-bridge':TOKEN},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store'});
 const data=await response.json().catch(()=>({ok:false,error:'JSON inválido'}));
 if(!response.ok||data.ok===false)throw Error('Cofre do WhatsApp indisponível (HTTP '+response.status+')');
 return data;
}
function seal(obj){
 const data=Buffer.from(JSON.stringify(obj));
 if(data.length>2_500_000)throw Error('Sessão excedeu limite de backup.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',storageKey,iv);
 const encrypted=Buffer.concat([cipher.update(data),cipher.final()]);
 return [iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),encrypted.toString('base64url')].join('.');
}
function unseal(value){
 const bits=String(value||'').split('.');if(bits.length!==3)throw Error('Formato do cofre inválido.');
 const iv=Buffer.from(bits[0],'base64url'),tag=Buffer.from(bits[1],'base64url'),data=Buffer.from(bits[2],'base64url');
 if(iv.length!==12||tag.length!==16||data.length>2_500_000)throw Error('Cofre inválido.');
 const decipher=createDecipheriv('aes-256-gcm',storageKey,iv);decipher.setAuthTag(tag);
 return JSON.parse(Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8'));
}
async function snapshot(){
 const names=await readdir(sessionDir);const files={};let total=0;
 if(names.length>350)throw Error('Quantidade excessiva de arquivos de sessão.');
 for(const name of names){
  if(basename(name)!==name||!name.endsWith('.json')||name.length>160)continue;
  const buffer=await readFile(join(sessionDir,name));total+=buffer.length;
  if(buffer.length>250000||total>2_500_000)throw Error('Backup de sessão excedeu limite.');
  files[name]=buffer.toString('base64url');
 }
 return {ownerId,files,version:1};
}
async function restore(){
 if(restored)return;
 const r=await vault('GET');
 if(r.sealed){
  const recovered=unseal(r.sealed);
  if(recovered.version!==1||typeof recovered.files!=='object')throw Error('Backup do WhatsApp inválido.');
  ownerId=String(recovered.ownerId||'');
  for(const [name,value] of Object.entries(recovered.files)){
   if(typeof name!=='string'||basename(name)!==name||!name.endsWith('.json')||name.length>160||typeof value!=='string')continue;
   const bytes=Buffer.from(value,'base64url');if(bytes.length>250000)continue;
   await writeFile(join(sessionDir,name),bytes,{mode:0o600});
  }
 }
 restored=true;
}
async function flush(){
 if(flushing){scheduleFlush();return}
 flushing=true;
 try{await vault('POST',{op:'save',sealed:seal(await snapshot())})}
 catch(e){error='Não foi possível persistir sessão no cofre; reconexão pode exigir QR.'}
 finally{flushing=false}
}
function scheduleFlush(){
 if(flushTimer)clearTimeout(flushTimer);
 flushTimer=setTimeout(()=>{flushTimer=null;void flush()},1700);
}
function scheduleReconnect(){
 if(restartTimer)return;
 backoff=Math.min(backoff+1,7);
 const wait=Math.min(60000,1000*2**backoff);
 restartTimer=setTimeout(()=>{restartTimer=null;void connect().catch(()=>{})},wait);
}
function digits(jid){
 const n=String(jid||'').split('@')[0].split(':')[0].replace(/\D/g,'');
 const phone=n.length===10||n.length===11?'55'+n:n;
 return DDD.test(phone)?phone:null;
}
function bodyOf(msg){
 const root=msg?.ephemeralMessage?.message||msg?.viewOnceMessage?.message||msg||{};
 return String(root.conversation||root.extendedTextMessage?.text||root.imageMessage?.caption||'').trim().slice(0,4000);
}
async function inbound(raw){
 if(raw?.key?.fromMe||!ownerId)return;
 const jid=String(raw?.key?.remoteJid||'');
 if(!jid.endsWith('@s.whatsapp.net'))return;
 const recipient=digits(jid),body=bodyOf(raw.message),id=String(raw.key?.id||'');
 if(!recipient||!body||!id||recentIds.has(id))return;
 recentIds.add(id);if(recentIds.size>500)recentIds.delete(recentIds.values().next().value);
 try{await vault('POST',{op:'inbound',owner_id:ownerId,phone:recipient,provider_id:id,body})}
 catch{recentIds.delete(id);error='Falha ao registrar recebimento no CRM.'}
}
async function connect(){
 if(ready||connecting)return connecting;
 connecting=(async()=>{
  try{
   status='connecting';error='';
   await restore();
   const {state,saveCreds}=await useMultiFileAuthState(sessionDir);
   const socket=makeWASocket({auth:state,logger,browser:Browsers.ubuntu('BLACKHOLE'),printQRInTerminal:false,markOnlineOnConnect:false,syncFullHistory:false});
   current=socket;
   socket.ev.on('creds.update',async()=>{await saveCreds();scheduleFlush()});
   socket.ev.on('messages.upsert',async ev=>{
    if(socket!==current)return;
    for(const m of (ev.messages||[]).slice(0,30))void inbound(m);
   });
   socket.ev.on('connection.update',async change=>{
    if(socket!==current)return;
    const {connection,qr,lastDisconnect}=change;
    if(qr){qrData=await QRCode.toDataURL(qr,{margin:1,width:256,errorCorrectionLevel:'M'});status='qr';ready=false;}
    if(connection==='open'){status='ready';ready=true;qrData='';phone=digits(socket.user?.id)||'';backoff=0;scheduleFlush()}
    if(connection==='close'){
     status='offline';ready=false;qrData='';current=null;
     const code=Number(lastDisconnect?.error?.output?.statusCode||0);
     if(code===DisconnectReason.loggedOut){
      status='logged_out';error='Sessão encerrada no WhatsApp. Será necessário novo QR.';
     }else scheduleReconnect();
    }
   });
  }catch(e){status='error';error=String(e?.message||e).slice(0,130);scheduleReconnect();}
  finally{connecting=null}
 })();
 return connecting;
}
async function readBody(req){
 let data='',total=0;
 for await(const chunk of req){total+=chunk.length;if(total>16000)throw Error('Corpo grande demais');data+=chunk.toString('utf8')}
 return data?JSON.parse(data):{};
}
const server=http.createServer(async(req,res)=>{
 try{
  const route=new URL(req.url||'/',"http://localhost").pathname;
  if(route==='/health'&&req.method==='GET')return reply(res,200,{ok:true,service:'BLACKHOLE QR',healthy:true});
  if(!authorized(req))return reply(res,401,{ok:false,error:'Não autorizado'});
  if(route==='/api/status'&&req.method==='GET')return reply(res,200,{ok:true,status,connected:ready,qr:status==='qr'?qrData:null,phone:ready?phone:null,error:error||null,provider:'Baileys (não oficial)'});
  if(route==='/api/connect'&&req.method==='POST'){
   const b=await readBody(req),requested=String(b.owner_id||'');
   if(!/^[0-9a-f-]{36}$/i.test(requested))return reply(res,400,{ok:false,error:'Operador inválido'});
   await restore();
   if(ownerId&&ownerId!==requested)return reply(res,403,{ok:false,error:'WhatsApp QR já vinculado a outro operador. Administração necessária.'});
   if(!ownerId){ownerId=requested;scheduleFlush()}
   void connect();return reply(res,202,{ok:true,status,connected:ready,qr:status==='qr'?qrData:null});
  }
  if(route==='/api/send'&&req.method==='POST'){
   const b=await readBody(req),to=digits(String(b.phone||'')+'@s.whatsapp.net'),message=String(b.text||'').trim();
   if(b.approved!==true)return reply(res,403,{ok:false,error:'Revisão manual obrigatória'});
   if(!to||!message||message.length>1000)return reply(res,400,{ok:false,error:'Destino ou conteúdo inválido'});
   if(!ready||!current)return reply(res,503,{ok:false,error:'WhatsApp QR não conectado'});
   if(Date.now()-lastSend<3500)return reply(res,429,{ok:false,error:'Aguarde antes de outro envio'});
   lastSend=Date.now();
   const delivered=await current.sendMessage(to+'@s.whatsapp.net',{text:message});
   const messageId=String(delivered?.key?.id||'');
   if(!messageId)return reply(res,502,{ok:false,error:'Provedor não confirmou aceite da mensagem'});
   return reply(res,200,{ok:true,accepted:true,delivered:false,messageId,provider:'Baileys'});
  }
  return reply(res,404,{ok:false,error:'Rota inexistente'});
 }catch(e){return reply(res,502,{ok:false,error:String(e?.message||e).slice(0,150)})}
});
server.listen(PORT,'0.0.0.0',()=>{console.log('BLACKHOLE QR worker pronto (sem exposição de sessão).')});
// Render Free dorme quando inativo; não há promessa de 24/7.
