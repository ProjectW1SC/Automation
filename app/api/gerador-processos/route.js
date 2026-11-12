import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {buildDjenSearchURL,parseDjenCandidates} from '../../../lib/djen-generator.mjs';
import {dedupeCandidateUpserts} from '../../../lib/blackhole-candidate-dedupe.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=35;
const result=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private,no-store'}});
export async function POST(request){
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return result({ok:false,error:'Entre no CRM antes da consulta.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return result({ok:false,error:'Supabase não configurado.'},503);
  const db=createClient(url,key,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user||!await checkCrmAccess(db,user))return result({ok:false,error:'Acesso não autorizado.'},403);
  const input=await request.json();
  const upstream=buildDjenSearchURL(input);
  const response=await fetch(upstream,{cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(response.status===429)return result({ok:false,error:'DJEN limitou consultas (429); respeite a pausa.'},429);
  if(response.status===403)return result({ok:false,error:'DJEN bloqueou esta rede (403). Não foram gerados resultados.'},503);
  if(!response.ok)return result({ok:false,error:'DJEN indisponível: HTTP '+response.status},502);
  const raw=await response.text();
  if(raw.length>2_000_000||raw.trim().startsWith('<'))return result({ok:false,error:'Resposta oficial não verificável.'},502);
  let payload;try{payload=JSON.parse(raw)}catch{return result({ok:false,error:'DJEN não retornou JSON válido.'},502)}
  const items=parseDjenCandidates(payload,String(input.term));
  let persisted=true,saveError='';
  if(items.length){
   const insert=dedupeCandidateUpserts(items.map(row=>({...row,owner_id:user.id})));
   const r=await db.from('crm_process_candidates').upsert(insert,{onConflict:'owner_id,process_number,query_term'});
   if(r.error){persisted=false;saveError='Resultados consultados, mas não gravados: '+r.error.message;}
  }
  return result({ok:true,items,limited:items.length>=50,persisted,saveError,checkedAt:new Date().toISOString(),
   notice:items.length?'Resultados públicos identificados pelo campo oficial numeroProcesso.':'A consulta retornou zero candidatos nesta janela; isso não comprova ausência de processos.'});
 }catch(e){let msg=e?.message||'Erro de consulta';
  const status=/Termo|intervalo|Tribunal|31 dias/i.test(msg)?400:502;
  if(e?.name==='TimeoutError'||e?.name==='AbortError')msg='DJEN excedeu 15 segundos; nenhum resultado foi presumido.';
  return result({ok:false,error:msg},status);
 }
}
