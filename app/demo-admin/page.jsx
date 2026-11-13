'use client';
import {useEffect,useState} from 'react';
import SecuredWorkspace from '../../components/secured-workspace';

const EMAIL='convidado.infinitum@example.com';
const AUTH_URL='https://supabase.com/dashboard/project/segjskjlbeydlljnefai/auth/users';
function DemoAdmin({db,session}){
 const [authorized,setAuthorized]=useState(false),[checking,setChecking]=useState(true);
 useEffect(()=>{let active=true;(async()=>{
  const {data,error}=await db.from('usuarios').select('cargo,role').eq('auth_user_id',session.user.id).limit(2);
  if(active){setAuthorized(!error&&data?.length===1&&/superadmin/i.test(String(data[0]?.cargo)+' '+String(data[0]?.role)));setChecking(false)}
 })();return()=>{active=false}},[db,session.user.id]);
 return <main className="inf-studio" style={{maxWidth:820,margin:'0 auto',padding:'28px 20px'}}>
  <header className="reference-header"><div>
   <span className="reference-overline">INFINITUM · AMBIENTE DE DEMONSTRAÇÃO</span>
   <h1>Conta de convidado</h1>
   <p>Empresa Aurora &amp; Horizonte Advocacia — organização isolada com cadastros e processos fictícios.</p>
  </div></header>
  <section className="inf-panel" style={{padding:24}}>
   {checking?<p>Conferindo permissão de administração...</p>:!authorized?
    <p role="alert">Somente o Superadmin da plataforma pode configurar o acesso de convidado.</p>:
    <>
     <h2>Carteira fictícia pronta</h2>
     <p>O ambiente contém 48 processos, 48 clientes, 36 leads, atendimentos, tarefas, documentos, audiência e histórico de movimentações simuladas. Nenhum registro é uma consulta real a tribunais.</p>
     <p><strong>E-mail de convidado reservado:</strong> <code>{EMAIL}</code></p>
     <h3>Ativação segura do login</h3>
     <p>O cadastro no Supabase Auth ainda precisa ser criado pelo administrador. Em Authentication → Users, selecione Add User, use o e-mail acima e uma senha de sua escolha, e confirme o usuário. Não compartilhe essa senha em conversas públicas.</p>
     <p>Depois da criação no Auth, execute o script de vínculo exclusivo da empresa demonstrativa no SQL Editor. Enquanto isso não ocorrer, o login não funcionará.</p>
     <a href={AUTH_URL} target="_blank" rel="noopener noreferrer" className="inf-btn primary">Abrir usuários do Supabase W1 Capital</a><p className="inf-note">Instruções completas e SQL do vínculo: repositório INFINITUM / docs / DEMO-CONVIDADO-ATIVACAO.md.</p>
     <p className="inf-note">A conta não pode ser ativada apenas com a existência de dados na carteira. Nenhuma senha foi pré-definida ou gravada no código.</p>
    </>}
  </section>
 </main>
}
export default function DemoAdminPage(){return <SecuredWorkspace active="Configurações">{({db,session})=><DemoAdmin db={db} session={session}/>}</SecuredWorkspace>}
