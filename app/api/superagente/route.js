import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {buildSuperAgentReview,targetCNJ} from '../../../lib/superagent-core.mjs';
import {formatProcessNumber} from '../../../lib/processos-oficiais.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store,private'}});
export async function POST(request){
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({ok:false,error:'Faça login no CRM.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({ok:false,error:'Conexão Supabase indisponível.'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error}=await db.auth.getUser(token);
  if(error||!user||!await checkCrmAccess(db,user))return json({ok:false,error:'Conta sem acesso à carteira.'},403);
  const {prompt}=await request.json();
  if(typeof prompt!=='string'||prompt.trim().length<6||prompt.length>1800)return json({ok:false,error:'Informe uma tarefa de 6 a 1.800 caracteres.'},400);
  const number=targetCNJ(prompt),formatted=number?formatProcessNumber(number):null;
  let processQ=db.from('office_cases').select('id,process_number,title,subject,status,client_id').limit(formatted?5:250);
  if(formatted)processQ=processQ.eq('process_number',formatted);
  const [p,c,l]=await Promise.all([
   processQ,db.from('office_clients').select('id').limit(100),
   db.from('crm_leads').select('id').limit(100)
  ]);
  const errors=[p,c,l].filter(x=>x.error).map(x=>x.error.message);
  if(errors.length)return json({ok:false,error:'A carteira não pôde ser lida integralmente: '+errors.join(' · ')},503);
  const allowedNumbers=[...new Set((p.data||[]).map(x=>x.process_number).filter(Boolean))];
  const snaps=allowedNumbers.length?await db.from('crm_judicial_snapshots')
   .select('process_number,source,checked_at,payload')
   .in('process_number',allowedNumbers.slice(0,200)).order('checked_at',{ascending:false}).limit(200):
   {data:[],error:null};
  if(snaps.error)return json({ok:false,error:'Não foi possível ler o histórico oficial: '+snaps.error.message},503);
  const review=buildSuperAgentReview(prompt,{processes:p.data||[],snapshots:snaps.data||[],clients:c.data||[],leads:l.data||[]});
  return json({ok:true,review,model:'motor-de-evidencias',isGenerativeModel:false,
   notice:'Roteador operacional baseado no LexisPredict; sem IA generativa configurada. Nenhum atendimento ou consulta externa foi executado.'});
 }catch(e){return json({ok:false,error:e.message||'Falha do superagente.'},502)}
}
