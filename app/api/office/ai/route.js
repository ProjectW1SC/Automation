import {officeAuth,officeJson,safeOfficeError} from '../../../../lib/office-server.mjs';
import {OFFICE_DOC_TYPES,makePetitionSkeleton} from '../../../../lib/office-core.mjs';
import {makeStandalonePetition} from '../../../../lib/blackhole-petitions.mjs';
import {APPEAL_TYPES} from '../../../../lib/legal-draft-engine.mjs';
import {isDemoUserCompany} from '../../../../lib/demo-tenant.mjs';
import {configuredBlackholeProvider} from '../../../../lib/blackhole-chat.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=35;
export async function POST(request){
 try{
  const {db,user}=await officeAuth(request);
  const p=await request.json();
  if(p?.externalAiConsent!==true)throw Object.assign(Error('Autorize expressamente o envio do documento e dos dados ao provedor de IA.'),{status:403});
  if(await isDemoUserCompany(db,user.id))throw Object.assign(Error('A demonstração utiliza somente dados fictícios e não envia documentos a modelos externos.'),{status:403});
  if(!OFFICE_DOC_TYPES.some(x=>x.id===p?.kind))throw Object.assign(Error('Tipo de peça inválido.'),{status:400});
  if(typeof p?.instructions!=='string'||p.instructions.length>6000)throw Object.assign(Error('As orientações devem ter até 6.000 caracteres.'),{status:400});
  if(typeof p?.sourceDocument!=='string'||p.sourceDocument.length>40000)throw Object.assign(Error('O documento de referência deve ter até 40.000 caracteres.'),{status:400});
  if(!APPEAL_TYPES.some(x=>x.id===(p.appealType||'')))throw Object.assign(Error('Modalidade recursal inválida.'),{status:400});
  if(p?.caseId!=null&&(typeof p.caseId!=='string'||!/^[0-9a-f-]{36}$/i.test(p.caseId)))
   throw Object.assign(Error('Identificador de processo inválido.'),{status:400});
  const provider=configuredBlackholeProvider(process.env);
  if(!provider)throw Object.assign(Error('Nenhum servidor de IA está configurado. A minuta estruturada local está disponível sem envio externo.'),{status:503});
  let caseRecord=null,client=null,evidence=[];
  if(p.caseId){
   const found=await db.from('office_cases').select('*').eq('id',p.caseId).maybeSingle();
   if(found.error||!found.data)throw Object.assign(Error('Processo não encontrado ou não autorizado.'),{status:403});
   caseRecord=found.data;
   if(caseRecord.client_id){
    const cl=await db.from('office_clients').select('id,name').eq('id',caseRecord.client_id).maybeSingle();
    if(cl.error)throw Object.assign(Error('Cliente não autorizado.'),{status:403});
    client=cl.data||null;
   }
   if(caseRecord.process_number){
    const snaps=await db.from('crm_judicial_snapshots').select('source,checked_at,payload')
     .eq('process_number',caseRecord.process_number).order('checked_at',{ascending:false}).limit(5);
    if(snaps.error)throw Object.assign(Error('Não foi possível consultar histórico privado do processo.'),{status:503});
    evidence=(snaps.data||[]).map(s=>({source:s.source,checked_at:s.checked_at,
     summary:String(s.payload?.items?.[0]?.title||s.payload?.items?.[0]?.description||'Consulta registrada').slice(0,200),
     simulated:s.payload?.demo===true||s.payload?.official===false}));
   }
  }
  const options={kind:p.kind,instructions:p.instructions,sourceDocument:p.sourceDocument,appealType:p.appealType||''};
  const skeleton=caseRecord?makePetitionSkeleton({...options,caseRecord,client,evidence}):makeStandalonePetition(options);
  const source=p.sourceDocument.length<=15000?p.sourceDocument:
   p.sourceDocument.slice(0,7500)+'\n[TRECHO INTERMEDIÁRIO NÃO ENVIADO; EXAMINAR ORIGINAL COMPLETO]\n'+p.sourceDocument.slice(-7500);
  const instructions=[
   'Base estrutural da minuta (campos pendentes precisam permanecer pendentes):',
   skeleton.body.slice(0,12500),
   '',
   'DOCUMENTO DE REFERÊNCIA FORNECIDO PELO OPERADOR (NÃO VERIFICADO NO TRIBUNAL):',
   source||'[NÃO FORNECIDO]'
  ].join('\n');
  const messages=[
   {role:'system',content:'Você auxilia um advogado brasileiro na redação de minutas para revisão humana. Escreva apenas dados explicitamente presentes no documento e nas instruções. Documento colado não constitui confirmação oficial. Não invente leis, precedentes, datas, resultado de sentença, pedidos ou qualificação. Para RECURSO, não presuma o cabimento, modalidade, tempestividade, preparo, dispositivo nem o resultado: use [CONFERIR]. Não diga que a peça foi protocolada ou assinada. Preserve as pendências e responda somente com a minuta em português brasileiro.'},
   {role:'user',content:instructions}
  ];
  const response=await fetch(new URL(provider.endpoint).toString(),{method:'POST',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+provider.key},
   body:JSON.stringify({model:provider.model,messages,temperature:0.1,max_tokens:2900}),
   signal:AbortSignal.timeout(17500),cache:'no-store'});
  if(!response.ok)throw Object.assign(Error('Modelo externo indisponível (HTTP '+response.status+').'),{status:503});
  const raw=await response.text();if(raw.length>500000)throw Error('Resposta da IA excedeu o tamanho permitido.');
  let obj;try{obj=JSON.parse(raw)}catch{throw Error('Resposta do modelo em formato inesperado.')}
  const content=obj?.choices?.[0]?.message?.content;
  if(typeof content!=='string'||content.trim().length<100)throw Error('A IA não retornou uma minuta válida.');
  return officeJson({ok:true,model:provider.model,
   content:content.slice(0,28000)+'\n\n[MINUTA ASSISTIDA POR IA. CONFERIR INTEIRO TEOR, CABIMENTO, PRAZOS, FUNDAMENTOS E PEDIDOS. NÃO PROTOCOLADA.]'});
 }catch(e){return safeOfficeError(e)}
}
