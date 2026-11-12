import test from 'node:test';import assert from 'node:assert/strict';
import {candidatePerson,saveNamedCandidate} from '../lib/office-candidate-save.mjs';
const user='550e8400-e29b-41d4-a716-446655440000',number='1001218-36.2026.5.02.0040';
test('DataJud without actual party name must not make a fake contact',()=>assert.throws(()=>candidatePerson({source:'DataJud'},''),/Informe o nome verdadeiro/));
test('manual operator person name and official recipient name keep the source',()=>{
 assert.deepEqual(candidatePerson({person_name:'Maria Souza',person_name_source:'DJEN_parte'},''),{name:'Maria Souza',source:'DJEN_parte'});
 assert.deepEqual(candidatePerson({},'Ana Maria'),{name:'Ana Maria',source:'operador'});
});
test('saveNamedCandidate links new person with case using real owner and no presumed phone',async()=>{
 const writes=[],db={from(table){
  const query={select(){return this},eq(){return this},limit(){return Promise.resolve({data:[]})},
   insert(row){writes.push({table,row});return {select(){return {single:async()=>({data:{id:table==='office_clients'?'client-id':'case-id'}})}}}}};return query}};
 const x=await saveNamedCandidate(db,{row:{source:'DJEN',process_number:number,headline:'Intimação',person_name:'Ana Maria',person_name_source:'DJEN_parte'},ownerId:user});
 assert.equal(x.name,'Ana Maria');assert.equal(writes[0].row.name,'Ana Maria');
 assert.equal(writes[1].row.client_id,'client-id');assert.ok(!('phone' in writes[0].row));
});
