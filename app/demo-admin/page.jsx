'use client';
import {useEffect,useState} from 'react';
import SecuredWorkspace from '../../components/secured-workspace';
const GUEST='convidado.infinitum@example.com';
function DemoAdmin({db,session}){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[credentials,setCredentials]=useState(null);
 useEffect(()=>{let active=true;(async()=>{
  const {data,error}=await db.from('usuarios').select('cargo,role').eq('auth_user_id',session.user.id).limit(2);
  if(active){setAuthorized(!error&&data?.length===1&&/superadmin/i.test(String(data[0]?.cargo)+' '+String(data[0]?.role)));setChecking(false)}
 })();return()=>{active=false}},[db,session.user.id]);
 async function activate(){
  if(!authorized||busy)return;
  if(!window.confirm('Criar ou redefinir o acesso fictício de convidado? A senha anterior deixará de funcionar.'))return;
  setBusy(true);setError('');setCredentials(null);
  try{
   const {data,error}=await db.functions.invoke('infinitum-demo-activate',{body:{confirm:'ATIVAR_DEMONSTRACAO'}});
   if(error||data?.ok!==true)throw Error(data?.error||error?.message||'Ativação não confirmada.');
   setCredentials({email:data.email,password:data.password});
  }catch(e){setError(String(e?.message||e))}
  finally{setBusy(false)}
 }
 return <main className="inf-studio" style={{maxWidth:840,margin:'0 auto',padding:'28px 20px'}}>
  <header className="reference-header"><div><span className="reference-overline">INFINITUM · AMBIENTE DEMONSTRATIVO</span>
   <h1>Ativar conta de convidado</h1><p>Empresa Aurora &amp; Horizonte Advocacia: registros inteiramente fictícios, separados da carteira real.</p></div></header>
  <section className="inf-panel" style={{padding:24}}>
   {checking?<p>Verificando permissão administrativa...</p>:!authorized?<p role="alert">Somente uma conta Superadmin autorizada pode ativar ou redefinir o login do convidado.</p>:<>
    <p>O usuário poderá explorar as mesmas abas do CRM: 48 processos e clientes, leads, tarefas, audiências, documentos, conversas e movimentações <strong>simuladas</strong>. Consultas judiciais externas e envio de WhatsApp são desativados para essa empresa.</p>
    <p><strong>E-mail reservado:</strong> {GUEST}</p>
    <button className="inf-btn primary" type="button" disabled={busy} onClick={activate}>{busy?'Ativando...':'Criar / renovar senha de convidado'}</button>
    {credentials&&<div role="status" style={{marginTop:18,padding:15,border:'1px solid #64748b',borderRadius:8}}>
     <strong>Credenciais geradas agora · exibir uma vez</strong>
     <p>E-mail: <code>{credentials.email}</code></p>
     <p>Senha: <code style={{wordBreak:'break-all'}}>{credentials.password}</code></p>
     <button className="inf-btn" type="button" onClick={()=>navigator.clipboard.writeText('E-mail: '+credentials.email+'\nSenha: '+credentials.password)}>Copiar credenciais</button>
     <p>Após copiar, feche esta página. Nunca publique a senha em páginas abertas.</p>
    </div>}
    </>}
   {error&&<p role="alert" className="inf-note error">{error}</p>}
  </section>
 </main>
}
export default function DemoAdminPage(){return <SecuredWorkspace active="Configurações">{({db,session})=><DemoAdmin db={db} session={session}/>}</SecuredWorkspace>}
