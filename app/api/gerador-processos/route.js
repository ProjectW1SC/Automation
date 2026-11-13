import {requestOfficialJson,djenPageInfo} from '../../../supabase/functions/_shared/official-http.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {buildDjenSearchURL,parseDjenCandidates} from '../../../lib/djen-generator.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=45;
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
  const payload=await requestOfficialJson(upstream,{headers:{Accept:'application/json'}},{source:'djen',page:Number(input.page||1)});
  const items=parseDjenCandidates(payload,String(input.term));
  let persisted=true,saveError='';
  if(items.length){
   const insert=items.map(row=>({...row,owner_id:user.id}));
   const r=await db.from('crm_process_candidates').upsert(insert,{onConflict:'owner_id,process_number,query_term'});
   if(r.error){persisted=false;saveError='Resultados consultados, mas não gravados: '+r.error.message;}
  }
  return result({ok:true,items,limited:djenPageInfo(payload,Number(input.page||1)).hasMore,persisted,saveError,checkedAt:new Date().toISOString(),
   notice:items.length?'Resultados públicos identificados pelo campo oficial numeroProcesso.':'A consulta retornou zero candidatos nesta janela; isso não comprova ausência de processos.'});
 }catch(e){let msg=e?.message||'Erro de consulta';
  const status=Number(e?.status)||(/Termo|intervalo|Tribunal|31 dias/i.test(msg)?400:502);
  if(e?.name==='TimeoutError'||e?.name==='AbortError')msg='DJEN excedeu 24 segundos; nenhum resultado foi presumido.';
  return result({ok:false,error:msg},status);
 }
}
