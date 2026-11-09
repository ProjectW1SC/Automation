// Finalization is a workflow decision. A sheet label is evidence of source state, not financial verification.
export function isFinalizedClient(c){return c?.workflow_status==='finalizado'}
export function finalizedClients(rows){return (rows||[]).filter(isFinalizedClient)}
export function reopenClientPatch(c,reason){
 if(!isFinalizedClient(c))throw new Error('Este acompanhamento não está finalizado.');
 if(typeof reason!=='string'||reason.trim().length<3)throw new Error('Informe o motivo para reabrir o acompanhamento.');
 return {workflow_status:'ativo'};
}
