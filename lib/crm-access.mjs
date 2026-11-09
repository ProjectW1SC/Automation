import {ADMIN_EMAIL} from './login.mjs';

// Uma sessão Supabase válida não basta: é necessário pertencer à carteira.
export async function checkCrmAccess(db,user) {
 if(!user?.id||!user?.email)return false;
 if(user.email.toLowerCase()===ADMIN_EMAIL)return true;
 if(!db?.from)return false;
 try{
  const {data,error}=await db.from('crm_memberships')
   .select('enabled,role').eq('user_id',user.id).eq('enabled',true).maybeSingle();
  return !error&&data?.enabled===true&&['admin','operator'].includes(data.role);
 }catch{return false}
}
