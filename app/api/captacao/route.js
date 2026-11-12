import {createClient} from '@supabase/supabase-js';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
const response=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const trim=(v,n=200)=>String(v||'').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,n);
export async function POST(request){
 try{
  const secret=process.env.TURNSTILE_SECRET_KEY,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!secret||!serviceKey||!url)return response({ok:false,error:'A captação está sendo configurada.'},503);
  if(Number(request.headers.get('content-length')||0)>12000)return response({ok:false,error:'Solicitação muito grande.'},413);
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin)return response({ok:false,error:'Origem não autorizada.'},403);
  const raw=await request.text();if(raw.length>12000)return response({ok:false,error:'Solicitação muito grande.'},413);
  let input;try{input=JSON.parse(raw)}catch{return response({ok:false,error:'Dados inválidos.'},400)}
  if(input.website)return response({ok:true,received:true}); // honeypot silencioso
  const name=trim(input.name,160),email=trim(input.email,180).toLowerCase()||null,phone=trim(input.phone,25)||null;
  const practice_area=trim(input.area,30),message=trim(input.message,900)||null;
  if(name.length<2||(!phone&&!email)||input.consent!==true||!['civil','trabalhista','familia','consumidor','previdenciario','empresarial','outro'].includes(practice_area))
   return response({ok:false,error:'Preencha os dados e confirme a autorização de contato.'},400);
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({ok:false,error:'E-mail inválido.'},400);
  const token=trim(input.turnstileToken,4000);
  if(!token)return response({ok:false,error:'Conclua a verificação antispam.'},400);
  const verify=new URLSearchParams({secret,response:token});
  const ip=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim();
  if(ip)verify.set('remoteip',ip);
  const checked=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',body:verify,signal:AbortSignal.timeout(8000),cache:'no-store'
  });
  if(!checked.ok)return response({ok:false,error:'Verificação indisponível.'},503);
  const result=await checked.json();
  if(!result.success)return response({ok:false,error:'Verificação antispam recusada.'},403);
  const client=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const inserted=await client.from('office_intake').insert({name,email,phone,practice_area,message,consent_source:'formulario_publico'});
  if(inserted.error)return response({ok:false,error:'Não foi possível registrar o contato. Tente novamente.'},503);
  return response({ok:true,received:true});
 }catch(e){return response({ok:false,error:'Solicitação indisponível. Tente novamente mais tarde.'},502)}
}
