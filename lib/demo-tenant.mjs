// Validar sempre a organizacao associada ao JWT do Supabase.
export const DEMO_GUEST_EMAIL='convidado.infinitum@example.com';
export const isDemoBranding=x=>!!x&&x.infinitum_demo===true;
export async function isDemoCompany(db,id){
 if(!id)return false;
 const {data,error}=await db.from('empresas').select('branding').eq('id',id).maybeSingle();
 if(error||!data)throw Object.assign(Error('Organização não validada para consulta.'),{status:503});
 return isDemoBranding(data.branding);
}
export async function isDemoUserCompany(db,userId){
 const {data,error}=await db.from('usuarios').select('empresa_id').eq('auth_user_id',userId).limit(2);
 if(error||data?.length!==1||!data[0]?.empresa_id)throw Object.assign(Error('Empresa da sessão não identificada.'),{status:403});
 return isDemoCompany(db,data[0].empresa_id);
}
