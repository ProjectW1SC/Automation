import SecuredWorkspace from '../../components/secured-workspace';
import LexisClosedCases from '../../components/lexis-closed-cases';
export default function Page(){return <SecuredWorkspace active="Encerrados">{({db,session})=><LexisClosedCases db={db} session={session}/>}</SecuredWorkspace>}
