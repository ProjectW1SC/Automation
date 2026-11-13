// Somente o JWT validado define a empresa. Nenhuma identidade vem do corpo da requisição.
export async function authorizeJudicialCase(db,userId,number){
 const profile=await db.from('usuarios').select('auth_user_id,empresa_id,nome').eq('auth_user_id',userId).limit(2);
 if(!profile.error&&profile.data?.length){
  if(profile.data.length!==1||profile.data[0].auth_user_id!==userId||!profile.data[0].empresa_id||!profile.data[0].nome)return false;
  const row=await db.from('processos').select('id').eq('empresa_id',profile.data[0].empresa_id)
   .in('protocolo_ref',[number,number.replace(/\D/g,'')]).limit(1);
  if(row.error)throw Error('Não foi possível validar a carteira da empresa.');
  return !!row.data?.length;
 }
 // Compatibilidade com o projeto antigo, que usa carteira individual e RLS.
 const permission=await db.rpc('office_has_access');
 if(permission.error||permission.data!==true)return false;
 const rows=await Promise.all([
  db.from('office_cases').select('id').eq('process_number',number).limit(1),
  db.from('crm_processes').select('id').eq('process_number',number).limit(1),
  db.from('crm_completed_activities').select('id').eq('actor_id',userId).eq('process_number',number).is('deleted_at',null).limit(1)
 ]);
 if(rows.some(r=>r.error))throw Error('Não foi possível validar o cadastro autorizado do processo.');
 return rows.some(r=>r.data?.length);
}
