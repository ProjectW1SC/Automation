// Paginação estável sem truncar silenciosamente dados do escritório.
// A autorização final entre empresas continua sob RLS.
const TABLES=Object.freeze({clients:'office_clients',cases:'office_cases',deadlines:'office_deadlines',
 documents:'office_documents',messages:'office_whatsapp_messages',leads:'crm_leads',runs:'office_agent_runs'});
const CONFIG=Object.freeze({
 clients:{sort:'name',asc:true,cap:8000},cases:{sort:'updated_at',asc:false,cap:8000},
 deadlines:{sort:'due_on',asc:true,cap:8000},documents:{sort:'created_at',asc:false,cap:1200},
 messages:{sort:'created_at',asc:false,cap:5000},leads:{sort:'created_at',asc:false,cap:8000},
 runs:{sort:'created_at',asc:false,cap:2500}
});
export async function fetchOfficeCollection(db,name,{pageSize=400,maxRows}={}){
 const table=TABLES[name],cfg=CONFIG[name];if(!db?.from||!table||!cfg)throw Error('Fonte desconhecida: '+name);
 const size=Math.min(500,Math.max(10,Number(pageSize)||400));
 const cap=Math.min(20000,Math.max(size,Number(maxRows)||cfg.cap));
 const rows=[];
 for(let offset=0;offset<cap;offset+=size){
  const take=Math.min(size,cap-offset);
  const {data,error}=await db.from(table).select('*').order(cfg.sort,{ascending:cfg.asc})
   .order('id',{ascending:true}).range(offset,offset+take-1);
  if(error)throw Error(table+': '+String(error.message||'Falha de consulta').slice(0,180));
  if(!Array.isArray(data))throw Error(table+': resposta inválida.');
  rows.push(...data);
  if(data.length<take)return rows;
 }
 throw Error(table+': limite de '+cap+' registros atingido; não é possível afirmar o total.');
}
export async function loadOfficeCollections(db,names,options={}){
 const sources=[...new Set(names||[])];
 const settled=await Promise.allSettled(sources.map(name=>fetchOfficeCollection(db,name,options)));
 const datasets={},errors=[];
 settled.forEach((r,i)=>r.status==='fulfilled'?datasets[sources[i]]=r.value:
  errors.push(sources[i]+': '+String(r.reason?.message||r.reason).slice(0,210)));
 return {datasets,errors,complete:errors.length===0};
}
