// Indicadores da empresa exigem paginação completa; PostgREST não deve ser truncado em 500 registros.
export const COMPANY_SOURCES={
 processes:['processos','id,empresa_id,cliente,protocolo_ref,ultimo_retorno,proximo_retorno,proximo_prazo,status,status_interno,statusManual:dados->>statusManual,situacao:dados->>situacao,atendido_por,observacoes,advogado,tribunal,created_at,updated_at'],
 hearings:['audiencias_monitoradas','id,empresa_id,processo_id,cliente,protocolo_ref,advogado,tribunal,tipo,data_evento,data_fim,hora_local,hora_fim,fuso,modalidade,situacao,fonte_url,portal_url'],
 tasks:['crm_tarefas','id,empresa_id,titulo,feito,due_at,assignee_id'],
 manual:['office_deadlines','id,empresa_id,title,due_on,kind,status,priority,notes,responsible']
};
export async function fetchCompanyRows(db,table,columns,company,{pageSize=500,maxRows=20000}={}){
 if(!company)throw new Error('Empresa não identificada.');
 const rows=[];
 for(let from=0;from<maxRows;from+=pageSize){
  const {data,error}=await db.from(table).select(columns).eq('empresa_id',company).order('id',{ascending:true}).range(from,from+pageSize-1);
  if(error)throw new Error(table+': '+error.message);
  const batch=data||[];rows.push(...batch);
  if(batch.length<pageSize)return rows;
 }
 throw new Error('Consulta '+table+' ultrapassou o limite de segurança. Dados parciais não são exibidos como totais.');
}
export async function loadLexisCompanySources(db,company){
 const names=Object.keys(COMPANY_SOURCES);
 const res=await Promise.allSettled(names.map(name=>fetchCompanyRows(db,...COMPANY_SOURCES[name],company)));
 const sources={processes:[],hearings:[],tasks:[],manual:[]},errors=[];
 res.forEach((item,i)=>{const name=names[i];if(item.status==='fulfilled')sources[name]=item.value;
 else errors.push(name+': '+String(item.reason?.message||item.reason));});
 return {sources,errors,valid:Object.fromEntries(names.map((name,i)=>[name,res[i].status==='fulfilled']))};
}
