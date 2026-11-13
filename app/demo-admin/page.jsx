'use client';
import {useEffect,useState} from 'react';
import SecuredWorkspace from '../../components/secured-workspace';
const EMAIL='convidado.infinitum@example.com';
function DemoAdmin({db,session}){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[credentials,setCredentials]=useState(null);
 useEffect(()=>{let active=true;(async()=>{
  const {data,error}=await db.from('usuarios').select('cargo,role,empresa_id')
   .eq('auth_user_id',session.user.id).limit(2);
  if(active){
   setAuthorized(!error&&data?.length===1&&
    [data[0]?.cargo,data[0]?.role].some(x=>String(x||'').trim().toLowerCase()==='superadmin')&&
    data[0].empresa_id!=='b889c08e-7378-47f1-9830-a03f87abb18f');
   setChecking(false);
  }
 })();return()=>{active=false}},[db,session.user.id]);
 async function activate(){
  if(!authorized||busy)return;
  if(!window.confirm('Criar ou renovar a senha do convidado? Se já existir, a senha anterior será invalidada.'))return;
  setBusy(true);setError('');setCredentials(null);
  try{
   const {data,error}=await db.functions.invoke('infinitum-demo-activate',{body:{confirm:'ATIVAR_DEMONSTRACAO'}});
   if(error||data?.ok!==true)throw Error(String(data?.error||error?.message||'Ativação não confirmada.').slice(0,220));
   if(data?.email!==EMAIL||typeof data.password!=='string'||data.password.length<16)
    throw Error('O serviço não retornou credenciais confirmadas.');
   setCredentials({email:data.email,password:data.password});
  }catch(e){setError(String(e?.message||e).slice(0,250))}
  finally{setBusy(false)}
 }
 return <main className="inf-studio" style={{maxWidth:830,margin:'0 auto',padding:'28px 20px'}}>
  <header className="reference-header"><div>
   <span className="reference-overline">INFINITUM · ADMINISTRAÇÃO</span>
   <h1>Convidado de demonstração</h1>
   <p>Aurora &amp; Horizonte Advocacia — dados 100% fictícios, separados do escritório real.</p>
  </div></header>
  <section className="inf-panel" style={{padding:24}}>
   {checking?<p>Verificando permissões...</p>:!authorized?
    <p role="alert">Somente o Superadmin autenticado pode criar ou redefinir a conta de demonstração.</p>:<>
    <p>Esta carteira já possui 48 processos, 48 clientes, 36 leads, documentos e movimentações simuladas. O login será criado no Supabase Auth apenas após sua confirmação, e associado exclusivamente à empresa fictícia.</p>
    <p><strong>E-mail:</strong> <code>{EMAIL}</code></p>
    <button type="button" className="inf-btn primary" onClick={activate} disabled={busy}>
     {busy?'Ativando com segurança...':'Criar ou renovar senha do convidado'}
    </button>
    {credentials&&<div role="status" style={{marginTop:18,padding:18,border:'1px solid #64748b',borderRadius:8}}>
     <strong>Credenciais criadas — copiar agora</strong>
     <p>E-mail: <code>{credentials.email}</code></p>
     <p>Senha temporária: <code style={{overflowWrap:'anywhere'}}>{credentials.password}</code></p>
     <button type="button" className="inf-btn" onClick={()=>navigator.clipboard.writeText('E-mail: '+credentials.email+'\nSenha: '+credentials.password)}>Copiar credenciais</button>
     <button type="button" className="inf-btn" onClick={()=>setCredentials(null)}>Ocultar senha</button>
     <p className="inf-note">A senha não é armazenada nesta página nem no GitHub. Guarde-a em um gerenciador de senhas e compartilhe somente com o convidado autorizado.</p>
    </div>}
    <p className="inf-note">As operações de demonstração não consultam tribunais reais nem enviam WhatsApp. Para recuperação manual, consulte docs/DEMO-CONVIDADO-ATIVACAO.md.</p>
   </>}
   {error&&<p role="alert" className="inf-note error">{error}</p>}
  </section>
 </main>;
}
export default function DemoAdminPage(){
 return <SecuredWorkspace active="Configurações">{({db,session})=><DemoAdmin db={db} session={session}/>}</SecuredWorkspace>
}
