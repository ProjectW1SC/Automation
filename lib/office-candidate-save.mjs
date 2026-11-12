// Save a candidate as a named CRM client only when a name is supplied by a
// structured official field or explicitly entered by the operator.
const t=x=>String(x||'').replace(/[<>\r\n\t]/g,' ').replace(/\s+/g,' ').trim();
export function candidatePerson(row,override){
 const official=t(row?.person_name),typed=t(override);
 const name=typed||official;
 if(name.length<2||name.length>180)throw new Error('Informe o nome verdadeiro da pessoa para salvar o contato. O DataJud público não fornece nomes de partes.');
 if(!/^[\p{L}\p{M}][\p{L}\p{M} .'’\u2010-\u2015-]{1,179}$/u.test(name))
  throw new Error('Nome da pessoa inválido. Não use número CNJ ou uma descrição do processo como nome de contato.');
 const source=typed&&typed!==official?'operador':(row?.person_name_source||'operador');
 return {name,source};
}
export async function saveNamedCandidate(db,{row,ownerId,enteredName}){
 const number=String(row?.process_number||'').trim();
 if(!/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(number))throw Error('Número CNJ inválido.');
 const {name,source}=candidatePerson(row,enteredName);
 const found=await db.from('office_clients').select('id,name').eq('name',name).limit(3);
 if(found.error)throw Error('Falha ao consultar contatos existentes: '+found.error.message);
 const matching=(found.data||[]).filter(x=>t(x.name).toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));
 if(matching.length>1)throw Error('Há contatos homônimos. Abra Clientes e selecione a pessoa correta antes do vínculo.');
 let clientId=matching[0]?.id;
 if(!clientId){
  const created=await db.from('office_clients').insert({owner_id:ownerId,name,
   notes:'Nome informado em '+source+' · candidato '+number+' · verificar identidade antes de qualquer contato.'}).select('id').single();
  if(created.error||!created.data?.id)throw Error('Não foi possível cadastrar o nome: '+(created.error?.message||'sem confirmação'));
  clientId=created.data.id;
 }
 const prior=await db.from('office_cases').select('id,client_id').eq('process_number',number).limit(2);
 if(prior.error)throw Error('Cliente salvo, mas não foi possível localizar o processo: '+prior.error.message);
 if(prior.data?.length){
  const existing=prior.data[0];
  if(existing.client_id&&existing.client_id!==clientId)throw Error('Processo já vinculado a outro cliente. Vínculo preservado para revisão.');
  if(!existing.client_id){
   const changed=await db.from('office_cases').update({client_id:clientId,updated_at:new Date().toISOString()}).eq('id',existing.id).is('client_id',null).select('id').maybeSingle();
   if(changed.error||!changed.data?.id)throw Error('Nome salvo, mas não foi possível vincular ao processo existente.');
  }
  return {clientId,caseId:existing.id,existing:true,name};
 }
 const sourceRow=row.source==='DataJud'?'DataJud':'DJEN';
 const added=await db.from('office_cases').insert({owner_id:ownerId,client_id:clientId,process_number:number,
  title:sourceRow+' · '+String(row.headline||'Candidato processual').slice(0,180),
  tribunal:row.tribunal||null,subject:row.query_term||null,status:'ativo',
  notes:'Candidato registrado pelo gerador. Nome: '+name+' ('+source+'). Não confirma tramitação ativa, fase, prazo nem vínculo como autor/réu; revisão documental obrigatória.'})
  .select('id').single();
 if(added.error||!added.data?.id)throw Error('Contato salvo, mas a ficha processual não pôde ser criada: '+(added.error?.message||'sem confirmação'));
 return {clientId,caseId:added.data.id,existing:false,name};
}
