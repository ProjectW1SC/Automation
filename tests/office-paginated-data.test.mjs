import test from 'node:test';import assert from 'node:assert/strict';
import {fetchOfficeCollection,loadOfficeCollections} from '../lib/office-paginated-data.mjs';
const db=(rows={},fails={})=>({calls:[],from(table){
 const that=this,q={sort:[],select(){return q},order(name){q.sort.push(name);return q},
 range(a,b){that.calls.push({table,a,b,sort:q.sort});return Promise.resolve(fails[table]?
  {error:{message:fails[table]}}:{data:(rows[table]||[]).slice(a,b+1),error:null})}};
 return q;
}});
test('1273 clientes nao sao reduzidos aos 500 primeiros',async()=>{
 const d=db({office_clients:Array.from({length:1273},(_,i)=>({id:i}))});
 assert.equal((await fetchOfficeCollection(d,'clients')).length,1273);
 assert.deepEqual(d.calls.map(x=>x.a),[0,400,800,1200]);
 assert.ok(d.calls.every(x=>x.sort.at(-1)==='id'));
});
test('falha de RLS nao zera a carteira enquanto outras fontes carregam',async()=>{
 const result=await loadOfficeCollections(db({office_clients:[{id:1}]},{office_cases:'RLS recusou'}),['clients','cases']);
 assert.equal(result.complete,false);assert.equal(result.datasets.clients.length,1);
 assert.equal(Object.hasOwn(result.datasets,'cases'),false);
 assert.match(result.errors.join(' '),/RLS/);
});
test('limite é avisado, sem retornar contagem parcial',async()=>{
 const d=db({office_clients:Array.from({length:64},(_,i)=>({id:i}))});
 await assert.rejects(fetchOfficeCollection(d,'clients',{pageSize:20,maxRows:40}),/limite de 40/);
});
test('nao le tabelas arbitrarias',async()=>assert.rejects(fetchOfficeCollection(db(),'auth.users'),/Fonte desconhecida/));
