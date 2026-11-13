import {authorizeJudicialCase} from '../../../supabase/functions/infinitum-judicial-query/access.mjs';
import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {checkCrmAccess} from '../../../lib/crm-access.mjs';
import {formatProcessNumber} from '../../../lib/processos-oficiais.mjs';
import {GET as consultOfficial} from '../processos/consulta/route.js';
import {buildScannerReview,sourceSummary} from '../../../lib/blackhole-office-scanner.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=90;
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private,no-store'}});
async function checkOne(number,source,token,force=false){
 const q=new URLSearchParams({numero:number,fonte:source});
 if(force)q.set('forcar','1');
 const req=new Request('https://blackhole.local/api/processos/consulta?'+q.toString(),{
  method:'GET',headers:{Authorization:'Bearer '+token}});
 try{
  const response=await consultOfficial(req);
  const r=await response.json();
  if(!response.ok||r?.ok!==true)return {ok:false,source,status:response.status,code:r?.code||null,error:String(r?.error||'Fonte indisponível').slice(0,450)};
  return {...r,source:source==='datajud'?'DataJud':'DJEN'};
 }catch(e){
  return {ok:false,source,error:e?.name==='TimeoutError'?'Tempo esgotado na consulta oficial.':String(e?.message||'Erro inesperado').slice(0,250)};
 }
}
export async function POST(request){
 try{
  const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return json({ok:false,error:'Faça login para executar o scanner.'},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({ok:false,error:'Supabase não configurado no servidor.'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user||!await checkCrmAccess(db,user))return json({ok:false,error:'Sem acesso autorizado aos processos do escritório.'},403);
  const body=await request.json();
  let number;try{number=formatProcessNumber(body?.process_number)}catch{return json({ok:false,error:'Informe CNJ válido com 20 dígitos.'},400)}
  if(!await authorizeJudicialCase(db,user.id,number))
   return json({ok:false,error:'CNJ não cadastrado na carteira autorizada da empresa.'},403);
  // Pesquisa duas fontes separadas, mesmo se a primeira falhar. O cache e backoff
  // são aplicados por cada rota oficial individual, sem fazer scraping ou simular resultado.
  const [datajud,djen]=await Promise.all([
   checkOne(number,'datajud',token,body?.force===true),
   checkOne(number,'djen',token,body?.force===true)
  ]);
  const sources=sourceSummary({datajud,djen}),now=new Date().toISOString();
  const snapshots=[{process_number:number,source:'datajud',checked_at:datajud.checkedAt||now,payload:{items:datajud.ok?datajud.items:[]}},
   {process_number:number,source:'djen',checked_at:djen.checkedAt||now,payload:{items:djen.ok?djen.items:[]}}];
  const review=buildScannerReview(snapshots,{today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())});
  const mode=body?.mode==='foreground'?'foreground':'manual';
  const save=await db.from('office_scan_runs').insert({actor_id:user.id,process_number:number,trigger_mode:mode,source_status:sources,
   review:{...review,hearings:review.hearings.slice(0,12),verdicts:review.verdicts.slice(0,12)}}).select('id').single();
  const notices=[
   sources.datajud.status==='confirmed'?'DataJud consultado.':'DataJud: '+sources.datajud.status+'.',
   sources.djen.status==='confirmed'?'DJEN/Comunica PJe consultado.':'DJEN: '+sources.djen.status+'.'
  ];
  return json({ok:true,number,sourceStatus:sources,review,checkedAt:now,
   saveId:save.data?.id||null,persisted:!save.error,
   saveError:save.error?'Consulta realizada, mas histórico não pôde ser gravado: '+save.error.message:null,
   notice:notices.join(' ')+' Os dois sistemas são independentes; indicação de audiência/decisão exige conferência dos autos.'});
 }catch(e){
  const status=/JSON|CNJ|Inválido|inválid/.test(e.message||'')?400:502;
  return json({ok:false,error:String(e?.message||'Falha do scanner').slice(0,400)},status);
 }
}
