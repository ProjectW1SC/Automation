'use client';
import SecuredWorkspace from '../../components/secured-workspace';
import LexisOperatorWorkspace from '../../components/lexis-operator-workspace';
export default function Page(){return <SecuredWorkspace active="Análises internas">{({db,session})=><LexisOperatorWorkspace area="analises" db={db} session={session}/>}</SecuredWorkspace>}
