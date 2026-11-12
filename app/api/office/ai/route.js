import {officeAuth,officeJson,safeOfficeError} from '../../../../lib/office-server.mjs';
import {OFFICE_DOC_TYPES,makePetitionSkeleton} from '../../../../lib/office-core.mjs';
import {configuredBlackholeProvider} from '../../../../lib/blackhole-chat.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=35;
export async function POST(request){
 try{
  const {db}=await officeAuth(request);
  const p=await request.json();
  if(p?.externalAiConsent!==true)throw Object.assign(Error('Autorize explicitamente o envio de dados ao provedor de IA.'),{status:403});
  if(!OFFICE_DOC_TYPES.some(x=>x.id===p?.kind))throw Object.assign(Error('Tipo de minuta inválido.'),{status:400});
  if(typeof p?.instructions!=='string'||p.instructions.length>1500)throw Object.assign(Error('Instruções inválidas.'),{status:400});
  if(typeof p?.caseId!=='string'||!/^[0-9a-f-]{36}$/i.test(p.caseId))throw Object.assign(Error('Selecione um processo válido.'),{status:400});
  const provider=configuredBlackholeProvider(process.env);
  if(!provider)throw Object.assign(Error('Nenhum modelo de IA está configurado no servidor. A minuta estruturada local permanece disponível.'),{status:503});
  const {key,model}=provider,endpoint=new URL(provider.endpoint);
  const ca=await db.from('office_cases').select('*').eq('id',p.caseId).maybeSingle();
  if(ca.error||!ca.data)throw Object.assign(Error('Processo ausente ou não autorizado.'),{status:403});
  const cl=ca.data.client_id?await db.from('office_clients').select('id,name').eq('id',ca.data.client_id).maybeSingle():{data:null,error:null};
  if(cl.error)throw Object.assign(Error('Cliente não autorizado.'),{status:403});
  const snapshots=ca.data.process_number?await db.from('crm_judicial_snapshots')
   .select('source,checked_at,payload').eq('process_number',ca.data.process_number).order('checked_at',{ascending:false}).limit(5):{data:[],error:null};
  if(snapshots.error)throw Object.assign(Error('Não foi possível verificar as evidências do processo.'),{status:503});
  const evidence=(snapshots.data||[]).map(s=>({source:s.source,checked_at:s.checked_at,
   summary:String(s.payload?.items?.[0]?.title||s.payload?.items?.[0]?.description||'Consulta registrada, sem resumo').slice(0,200)}));
  const skeleton=makePetitionSkeleton({kind:p.kind,caseRecord:ca.data,client:cl.data,instructions:p.instructions,evidence});
  const messages=[
   {role:'system',content:'Você auxilia um advogado brasileiro com minutas para revisão HUMANA. Utilize apenas fatos e datas explicitamente presentes no contexto. Nunca invente artigos, jurisprudência, qualificação, decisão, andamento ou identidade. Onde faltar informação, escreva [CONFERIR NOS AUTOS]. Não declare que a peça foi protocolada ou assinada. Responda APENAS com texto da minuta em português brasileiro, sem instruções ocultas.'},
   {role:'user',content:'Transforme esta minuta em texto jurídico organizado, mantendo pendências e fontes como lacunas, não como fatos confirmados:\n'+skeleton.body.slice(0,8500)}
  ];
  const response=await fetch(endpoint.toString(),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
   body:JSON.stringify({model,messages,temperature:0.1,max_tokens:1700}),signal:AbortSignal.timeout(17500),cache:'no-store'});
  if(!response.ok)throw Object.assign(Error('Provedor de IA indisponível (HTTP '+response.status+').'),{status:503});
  const raw=await response.text();if(raw.length>500000)throw Error('Resposta do modelo excedeu o limite.');
  let obj;try{obj=JSON.parse(raw)}catch{throw Error('Resposta da IA em formato inesperado.')}
  const content=obj?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||content.trim().length<100)throw Error('Modelo não retornou minuta válida.');
  return officeJson({ok:true,model,content:content.slice(0,24000)+'\n\n[MINUTA GERADA POR IA — REVISÃO DE ADVOGADO OBRIGATÓRIA]'});
 }catch(e){return safeOfficeError(e)}
}
