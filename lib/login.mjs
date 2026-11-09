// Login isolado do ProjectW1SC. Nenhuma senha é guardada no código, no GitHub ou em variáveis públicas.
export const ADMIN_EMAIL = 'intermedioesenegociacoes@gmail.com';

export function interpretLoginError(error) {
  const message=String(error?.message||error||'').toLowerCase();
  if (/invalid login credentials|invalid credentials|invalid_grant|password.*invalid/.test(message))
    return 'E-mail ou senha incorretos. Use a recuperação de senha abaixo se necessário.';
  if (/email not confirmed|email.*not.confirmed/.test(message))
    return 'O e-mail ainda não foi confirmado no Supabase.';
  if (/over_email_send_rate_limit|rate limit|too many requests/.test(message))
    return 'Muitas tentativas. Tente novamente mais tarde.';
  if (/network|failed to fetch/.test(message))
    return 'Não foi possível acessar o servidor de login. Verifique a conexão.';
  return String(error?.message||error||'Não foi possível autenticar.');
}
export function ensurePassword(password) {
  if (typeof password!=='string' || password.length<8)
    throw new Error('Informe uma senha de pelo menos 8 caracteres.');
  return password;
}
export async function signInWithPassword(auth,password) {
  const {data,error}=await auth.signInWithPassword({email:ADMIN_EMAIL,password:ensurePassword(password)});
  if(error)throw new Error(interpretLoginError(error));
  if(!data?.session) throw new Error('O servidor não retornou uma sessão. Confira o cadastro no Supabase.');
  return data;
}
export async function sendRecovery(auth,origin) {
  const url=new URL(origin).origin + '/';
  const {error}=await auth.resetPasswordForEmail(ADMIN_EMAIL,{redirectTo:url});
  if(error)throw new Error(interpretLoginError(error));
}
export async function changePassword(auth,password) {
  const {data,error}=await auth.updateUser({password:ensurePassword(password)});
  if(error)throw new Error(interpretLoginError(error));
  return data;
}
