import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeJudicialCase} from '../supabase/functions/infinitum-judicial-query/access.mjs';
import {loadPortfolioHistory,savedOfficialHistory} from '../lib/portfolio-history.mjs';
import {consultHistoricalCase} from '../lib/judicial-history-client.mjs';
import {consultBothOfficialSources} from '../lib/combined-judicial-history.mjs';
const number='0001234-56.2024.8.13.0001';

function database({company='org-a',rowCompany='org-a',activityFailure=false,snapshotFailure=false}={}){
 const queries=[];
 return {queries,rpc(){throw Error('The shared account must not depend on the legacy access RPC')},
  from(table){const filters={};queries.push({table,filters});const q={
   select(){return q},eq(k,v){filters[k]=v;return q},in(k,v){filters[k]=v;return q},limit(){return q},order(){return q},
   then(resolve,reject){
    let result;
    if(table==='usuarios')result={data:[{auth_user_id:'user-a',empresa_id:company,nome:'Operador'}]};
    if(table==='processos')result={data:filters.empresa_id===rowCompany?[{id:101}]:[]};
    if(table==='tarefas_realizadas')result=activityFailure?{error:{message:'Histórico indisponível'}}:{data:Array.from({length:4},(_,id)=>({id,descricao:'Atendimento salvo'}))};
    if(table==='crm_judicial_snapshots')result=snapshotFailure?{error:{message:'Cache indisponível'}}:{data:[{process_number:number,source:'datajud',checked_at:'2026-11-09',payload:{ok:true,court:'TJMG',items:[{id:'dj-1',source:'DataJud',date:'2026-11-01',title:'Movimento salvo'}]}}]};
    return Promise.resolve(result).then(resolve,reject);
   }
  };return q}
 };
}
test('regional authorization recognizes the Lexis portfolio and rejects another company',async()=>{
 const db=database();assert.equal(await authorizeJudicialCase(db,'user-a',number),true);
 assert.deepEqual(db.queries[1].filters,{empresa_id:'org-a',protocolo_ref:[number,number.replace(/\D/g,'')]});
 assert.equal(await authorizeJudicialCase(database({rowCompany:'org-b'}),'user-a',number),false);
});
test('consultation history loads four saved attendances plus verified court movements within the company',async()=>{
 const db=database();
 const result=await loadPortfolioHistory({db,companyId:'org-a',processId:101,number});
 assert.equal(result.activities.length,4);assert.equal(result.officialItems.length,1);
 assert.equal(result.officialItems[0].savedAt,'2026-11-09');
 assert.deepEqual(db.queries.map(q=>q.filters),[{empresa_id:'org-a',processo_id:101},{empresa_id:'org-a',process_number:number}]);
});
test('a failure in saved judicial history does not hide the attendance history',async()=>{
 const result=await loadPortfolioHistory({db:database({snapshotFailure:true}),companyId:'org-a',processId:101,number});
 assert.equal(result.activities.length,4);assert.deepEqual(result.officialItems,[]);assert.match(result.errors[0],/Cache indisponível/);
});
test('stored snapshots from another case or the wrong court are never displayed',()=>{
 assert.deepEqual(savedOfficialHistory([{process_number:number,source:'datajud',payload:{ok:true,court:'TST',items:[{id:'other',source:'DataJud'}]}}],number),[]);
 assert.deepEqual(savedOfficialHistory([{process_number:'other-case',source:'djen',payload:{ok:true,items:[{id:'other',source:'DJEN'}]}}],number),[]);
});
test('empty DJEN plus failed DataJud retains the real error and does not claim a complete history',async()=>{
 const result=await consultHistoricalCase({number,fetchServer:async()=>({ok:true,items:[],sourceStatus:{djen:'ok',datajud:'unavailable'},sourceErrors:{datajud:'Função regional não encontrada'}})});
 assert.equal(result.found,false);assert.equal(result.partial,true);
 assert.match(result.sourceErrors.datajud,/Função regional/);
 assert.match(result.notice,/histórico judicial não foi confirmado/);
});
test('CRM authorization failure cannot trigger a public-browser retry',async()=>{
 let called=false;
 await assert.rejects(()=>consultHistoricalCase({number,fetchServer:async()=>({ok:false,code:'crm_access',error:'Sessão expirada'}),fetchBrowser:async()=>{called=true}}),/Sessão expirada/);
 assert.equal(called,false);
});
test('a successful official response preserves a history-storage failure for the UI',async()=>{
 const combined=await consultBothOfficialSources({djen:async()=>({ok:true,items:[],snapshotError:'Histórico não armazenado'}),datajud:async()=>({ok:true,items:[]})});
 const result=await consultHistoricalCase({number,fetchServer:async()=>combined});
 assert.deepEqual(result.persistenceErrors,['Histórico não armazenado']);
});

test('falha de DJEN em modo independente não perde os movimentos DataJud nem deixa status checking',async()=>{
 const updates=[];
 const result=await consultHistoricalCase({number,source:'auto',independentSources:true,fetchServer:async ({source})=>{
  if(source==='djen')throw Error('DJEN recusou acesso HTTP 403');
  return {ok:true,source:'DataJud',items:[{id:'jud-1',source:'DataJud',date:'2026-11-12',title:'Movimento'}]};
 },onResult:state=>updates.push(state)});
 assert.equal(result.ok,true);assert.equal(result.items.length,1);assert.equal(result.partial,true);
 assert.equal(result.sourceStatus.datajud,'ok');assert.notEqual(result.sourceStatus.djen,'checking');
 assert.match(result.notice,/parcial/i);assert.equal(updates.length>=2,true);
});
test('sem sessão não permite resultado parcial nem retry de navegador na consulta independente',async()=>{
 await assert.rejects(()=>consultHistoricalCase({number,source:'auto',independentSources:true,
 fetchServer:async()=>({ok:false,code:'crm_access',error:'Sem carteira autorizada'})}),/Sem carteira/);
});
test('consulta demo em duas fontes permanece simulada e nunca vira evento confirmado',async()=>{
 let browser=0;
 const result=await consultHistoricalCase({number,source:'auto',independentSources:true,
 fetchServer:async({source})=>({ok:true,demo:true,items:[{id:source,source:source==='djen'?'DJEN':'DataJud',title:'[SIMULAÇÃO] Movimento'}],
  sourceStatus:{[source]:'simulated'}}),fetchBrowser:async()=>{browser++;throw Error('nunca acessar')}});
 assert.equal(browser,0);assert.equal(result.demo,true);assert.equal(result.partial,false);
 assert.equal(result.sourceStatus.djen,'simulated');
 assert.equal(result.sourceStatus.datajud,'simulated');
});
