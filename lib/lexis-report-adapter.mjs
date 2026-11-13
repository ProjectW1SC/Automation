import {responsibleDisplay,isFinished} from './lexis-operations.mjs';
// Modelo de leitura do relatório executivo original do Infinitum.
// Cada linha Lexis é um processo, não um cliente único (não mesclar homônimos).
export function adaptLexisToExecutiveReport({processes=[],activities=[],members=[]}={}){
 const clients=(processes||[]).map(p=>({
  id:'lexis:'+p.id,
  name:p.cliente||p.protocolo_ref||'Cliente não identificado',
  workflow_status:isFinished(p.status_interno)?'finalizado':'ativo',
  next_return:p.proximo_retorno||p.proximo_prazo||null,
  due_override:p.proximo_prazo||null,
  assigned_to:responsibleDisplay(p.atendido_por,members),
  consultant:p.advogado||null,
  priority_level:'normal',
  institution:p.tribunal||null,
  notes:p.observacoes||null,
  last_attendance_at:p.ultimo_retorno?p.ultimo_retorno+'T15:00:00Z':null,
  source_status:null,evidence_status:null,source_conflict:false,
  finished_at:null // data de encerramento não comprovada pelo cadastro.
 }));
 const valid=(activities||[]).filter(a=>a?.processo_id!=null&&a?.data_realizacao);
 const audit=valid.filter(a=>a.categoria==='atendimento').map(a=>({
  id:a.id,client_id:'lexis:'+a.processo_id,actor_id:a.responsavel_auth_user_id,
  kind:'atendimento',body:a.descricao||null,created_at:a.data_realizacao+'T15:00:00Z',contact_confirmed:a.contato_cliente_confirmado===true
 }));
 const manual=valid.filter(a=>a.categoria!=='atendimento').map(a=>({
  id:a.id,client_id:'lexis:'+a.processo_id,actor_id:a.responsavel_auth_user_id,
  origin:null,category:a.categoria||'outro',title:a.titulo||'Atividade registrada',
  description:a.descricao||'',performed_on:a.data_realizacao,
  created_at:a.created_at||a.data_realizacao+'T15:00:00Z',contact_confirmed:false,
  deleted_at:null,duration_seconds:0
 }));
 const priorityAudit=valid.map(a=>({
  id:a.id,client_id:'lexis:'+a.processo_id,actor_id:a.responsavel_auth_user_id,
  kind:a.categoria==='anotacao'?'anotacao':a.categoria==='atendimento'?'atendimento':a.categoria||'outro',
  body:a.descricao||null,created_at:a.created_at||a.data_realizacao+'T15:00:00Z'
 }));
 const priorityManual=manual.map(x=>({...x}));
 return {clients,audit,manual,priorityAudit,priorityManual};
}
