import {mergeEvents,dataJudSnapshotIsFromCourt} from './processos-oficiais.mjs';

export function savedOfficialHistory(snapshots=[],number){
 const events=[];
 for(const row of snapshots){
  if(row.process_number!==number||row.payload?.ok!==true||!Array.isArray(row.payload?.items))continue;
  if(row.source==='datajud'){try{if(!dataJudSnapshotIsFromCourt(row.payload,number))continue}catch{continue}}
  if(!['djen','datajud'].includes(row.source))continue;
  for(const item of row.payload.items){
   if(item?.source!==(row.source==='djen'?'DJEN':'DataJud'))continue;
   events.push({...item,savedAt:row.checked_at});
  }
 }
 return mergeEvents(events);
}

export async function loadPortfolioHistory({db,companyId,processId,number}){
 if(!companyId||processId==null)throw Error('Histórico exige processo e empresa autorizados.');
 const [activities,snapshots]=await Promise.allSettled([
  db.from('tarefas_realizadas').select('id,descricao,categoria,data_realizacao,responsavel_auth_user_id,contato_cliente_confirmado,created_at')
   .eq('empresa_id',companyId).eq('processo_id',processId).order('created_at',{ascending:false}).limit(100),
  number?db.from('crm_judicial_snapshots').select('process_number,source,checked_at,payload')
   .eq('empresa_id',companyId).eq('process_number',number).order('checked_at',{ascending:false}).limit(30):Promise.resolve({data:[]})
 ]);
 const errors=[];
 const read=(result,label)=>{
  if(result.status==='rejected'||result.value.error){errors.push(label+': '+String(result.reason?.message||result.value?.error?.message||'consulta indisponível'));return []}
  return result.value.data||[];
 };
 return {activities:read(activities,'Histórico de atendimentos'),officialItems:savedOfficialHistory(read(snapshots,'Histórico judicial salvo'),number),errors};
}
