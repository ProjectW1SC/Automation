// Provisionamento permitido somente a uma sessão válida do administrador original.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const site='https://projectw1sc-crm.vercel.app';
const cors={
 'Access-Control-Allow-Origin':site,
 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Content-Type':'application/json;charset=utf-8',
 'Cache-Control':'no-store'
};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return reply({ok:false,error:'Método não permitido.'},405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==site)return reply({ok:false,error:'Origem não autorizada.'},403);
 const jwt=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!jwt)return reply({ok:false,error:'Entre como administrador antes de cadastrar usuários.'},401);
 const url=Deno.env.get('SUPABASE_URL');
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return reply({ok:false,error:'Serviço de autenticação indisponível.'},503);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:identity,error:identityError}=await admin.auth.getUser(jwt);
 if(identityError||!identity.user||identity.user.email?.toLowerCase()!=='intermedioesenegociacoes@gmail.com')
  return reply({ok:false,error:'Somente o administrador principal pode criar contas.'},403);
 let body;
 try{body=await request.json()}catch{return reply({ok:false,error:'Dados inválidos.'},400)}
 const email=String(body?.email||'').trim().toLowerCase();
 const password=body?.password;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({ok:false,error:'Informe um e-mail válido.'},400);
 if(typeof password!=='string'||password.length<8||password.length>128)return reply({ok:false,error:'A senha precisa ter de 8 a 128 caracteres.'},400);
 // A senha só é encaminhada ao Auth e jamais registrada em tabelas ou logs.
 const {data:created,error:createError}=await admin.auth.admin.createUser({
  email,password,email_confirm:true
 });
 if(createError)return reply({ok:false,error:createError.message||'Não foi possível criar o usuário.'},400);
 const user=created?.user;
 if(!user?.id)return reply({ok:false,error:'O Auth não confirmou o cadastro.'},502);
 const {error:membershipError}=await admin.from('crm_memberships')
  .upsert({user_id:user.id,role:'admin',enabled:true},{onConflict:'user_id'});
 if(membershipError){
  // Sem acesso parcial: se a associação não funcionar, a conta recém-criada é cancelada.
  await admin.auth.admin.deleteUser(user.id);
  return reply({ok:false,error:'Falha ao autorizar a carteira. Nenhum acesso foi liberado.'},503);
 }
 return reply({ok:true,email:user.email,role:'admin'});
});
