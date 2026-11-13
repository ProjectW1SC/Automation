import SecuredWorkspace from '../../components/secured-workspace';
import LexisOperatorWorkspace from '../../components/lexis-operator-workspace';
export default function Page(){return <SecuredWorkspace active="Atividades">{({db,session})=><LexisOperatorWorkspace area="atividades" db={db} session={session}/>}</SecuredWorkspace>}
