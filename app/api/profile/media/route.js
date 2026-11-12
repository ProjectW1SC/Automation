import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {PROFILE_BUCKET,ownerAvatarPath} from '../../../../lib/profile-settings.mjs';
import {APPEARANCE_BUCKET} from '../../../../lib/appearance-settings.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const noStore={'Cache-Control':'private,no-store,max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Authorization'};
export async function GET(request){
 try{
  const token=String(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return NextResponse.json({ok:false,error:'Sessão necessária.'},{status:401,headers:noStore});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.json({ok:false,error:'Armazenamento indisponível.'},{status:503,headers:noStore});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user?.id)return NextResponse.json({ok:false,error:'Sessão inválida.'},{status:401,headers:noStore});
  const type=new URL(request.url).searchParams.get('type');
  const metadata=user.user_metadata||{};
  const path=type==='avatar'?String(metadata.avatar_path||''):
   type==='background'?String(metadata.crm_background_path||''):'';
  const bucket=type==='avatar'?PROFILE_BUCKET:type==='background'?APPEARANCE_BUCKET:'';
  if(!bucket||!path||!path.startsWith(user.id+'/')||
    (type==='avatar'&&!ownerAvatarPath(user.id,path))||
    (type==='background'&&!new RegExp('^'+user.id+'/background-[a-zA-Z0-9-]{2,72}\\.(png|jpg|webp)$').test(path))){
   return new NextResponse(null,{status:404,headers:noStore});
  }
  const {data:signed,error:signError}=await db.storage.from(bucket).createSignedUrl(path,45);
  if(signError||!signed?.signedUrl)return new NextResponse(null,{status:404,headers:noStore});
  const response=await fetch(signed.signedUrl,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(9000)});
  if(!response.ok)return new NextResponse(null,{status:404,headers:noStore});
  const contentType=response.headers.get('content-type')||'';
  if(!/^image\/(jpeg|png|webp)$/.test(contentType))return new NextResponse(null,{status:415,headers:noStore});
  const bytes=await response.arrayBuffer();if(bytes.byteLength>3*1024*1024)return new NextResponse(null,{status:413,headers:noStore});
  return new NextResponse(bytes,{status:200,headers:{...noStore,'Content-Type':contentType,'Content-Length':String(bytes.byteLength)}});
 }catch{return new NextResponse(null,{status:502,headers:noStore})}
}
