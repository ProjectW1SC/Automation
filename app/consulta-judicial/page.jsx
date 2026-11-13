'use client';
import SecuredWorkspace from '../../components/secured-workspace';
import LexisJudicialDossier from '../../components/lexis-judicial-dossier';
export default function Page(){return <SecuredWorkspace active="Processos">{({db,session})=><LexisJudicialDossier db={db} session={session}/>}</SecuredWorkspace>}
