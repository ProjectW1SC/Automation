// Official DataJud can return HTTP 200 with an incomplete Elasticsearch result.
// Never promote such responses into an absence-of-movements assertion.
const coded=(message,code,status=502)=>Object.assign(new Error(message),{code,status});
export function validatePublicDataJudResponse(payload){
 if(!payload||typeof payload!=='object')throw coded('DataJud retornou um corpo sem formato JSON processual.','invalid_payload');
 if(payload.timed_out===true)throw coded('Índice DataJud excedeu o tempo de execução (HTTP 200 incompleto).','index_timeout');
 if(Number(payload?._shards?.failed||0)>0)throw coded('Índice DataJud retornou falha parcial de shards.','shard_failure');
 if(!Array.isArray(payload?.hits?.hits))throw coded('DataJud não retornou uma lista de resultados reconhecível.','invalid_payload');
 return payload;
}
export function currentPublicKey(value,fallback=''){
 return String(value||fallback||'').trim().replace(/^APIKey\s+/i,'').trim();
}
