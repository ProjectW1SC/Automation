'use client';
import SecuredWorkspace from '../../components/secured-workspace';
import WaAutoInbox from '../../components/wa-auto-inbox';
export default function WhatsAppPage(){return <SecuredWorkspace active="WhatsApp">{({db})=><WaAutoInbox db={db}/>}</SecuredWorkspace>}
