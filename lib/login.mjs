// Login isolado do ProjectW1SC. Nenhuma senha é guardada no código, no GitHub ou em variáveis públicas.
export const ADMIN_EMAIL = 'intermedioesenegociacoes@gmail.com';
export const RECOVERY_COOLDOWN_MS = 60 * 60 * 1000;

export function isRecoveryRateLimit(error) {
  const code=String(error?.code||'').toLowerCase();
  const msg=String(error?.message||'').toLowerCase();
  return Number(error?.status)===429 || /over_email_send_rate_limit|over_request_rate_limit/.test(code) || /email rate limit exceeded|too many requests/.test(msg);
}
export function canRequestRecovery(blockedUntil,now=Date.now()) {
  return !Number.isFinite(Number(blockedUntil)) || now >= Number(blockedUntil);
}
function authError(error) {
  const enriched=new Error(interpretLoginError(error));
  enriched.code=error?.code ?? null;
  enriched.status=error?.status ?? null;
  return enriched;
}


export function interpretLoginError(error) {
  const message=String(error?.message||error||'').toLowerCase();
  const code=String(error?.code||'').toLowerCase();
  if(isRecoveryRateLimit(error))
    return 'O Supabase atingiu o limite de envio de e-mails. Não solicite novos links agora. Aguarde a liberação do limite ou use a administração do Supabase para redefinir a senha.';
  if (code==='invalid_credentials'||/invalid login credentials|invalid credentials|invalid_grant|password.*invalid/.test(message))
    return 'Senha incorreta para esta conta. Não adianta tentar vários links: redefina a senha no Supabase ou use a recuperação quando o limite de e-mails for liberado.';
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
  if(error)throw authError(error);
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
