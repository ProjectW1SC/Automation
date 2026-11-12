import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../../lib/crm-access.mjs';
import {buildDataJudDiscoveryQuery,normalizeDataJudCandidates} from '../../../../lib/blackhole-datajud-discovery.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=25;
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private,no-store'}});
// A chave pública é publicada pelo CNJ e pode ser substituída via variável de ambiente.
const PUBLIC_KEY='cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
export async function POST(request){
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({ok:false,error:'Entre na sua carteira jurídica.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({ok:false,error:'Conexão Supabase indisponível.'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user||!(await checkCrmAccess(db,user)))return json({ok:false,error:'Acesso não autorizado.'},403);
  const input=await request.json(),{url:apiUrl,payload}=buildDataJudDiscoveryQuery(input);
  const result=await fetch(apiUrl,{method:'POST',headers:{Authorization:'APIKey '+(process.env.DATAJUD_API_KEY||PUBLIC_KEY),
   'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),
   cache:'no-store',redirect:'error',signal:AbortSignal.timeout(13500)});
  if(result.status===403)return json({ok:false,error:'DataJud bloqueou esta rede (403). A consulta não foi confirmada.'},503);
  if(result.status===429)return json({ok:false,error:'DataJud limitou consultas (429). Tente em outro momento sem repetir em massa.'},429);
  if(!result.ok)return json({ok:false,error:'DataJud indisponível (HTTP '+result.status+').'},502);
  const raw=await result.text();
  if(raw.length>900000||raw.trimStart().startsWith('<'))return json({ok:false,error:'Resposta oficial DataJud não verificável.'},502);
  let obj;try{obj=JSON.parse(raw)}catch{return json({ok:false,error:'DataJud não retornou JSON válido.'},502)}
  const rows=normalizeDataJudCandidates(obj,input.term);
  let persisted=true,saveError='';
  if(rows.length){
   const upsert=await db.from('crm_process_candidates').upsert(rows.map(x=>({...x,owner_id:user.id})),
    {onConflict:'owner_id,process_number,query_term'});
   if(upsert.error){persisted=false;saveError='Consulta real concluída, mas resultados não salvos: '+upsert.error.message}
  }
  return json({ok:true,source:'DataJud',items:rows,persisted,saveError,limited:rows.length===20,checkedAt:new Date().toISOString(),
   notice:rows.length?'Metadados processuais retornados pelo DataJud (CNJ). Não equivalem a publicação DJEN nem confirmam status ativo.':
   'Não foram localizados metadados para a expressão nesse tribunal. Isso não prova inexistência de processos.'});
 }catch(e){
  const msg=e?.name==='TimeoutError'||e?.name==='AbortError'?'DataJud excedeu 13,5 segundos; não foram gerados resultados.':e?.message||'Consulta não concluída.';
  const status=/Tribunal|expressão|4 a 110/.test(msg)?400:502;
  return json({ok:false,error:msg},status);
 }
}
