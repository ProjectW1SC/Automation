import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCourtAlias as webAlias} from '../lib/processos-oficiais.mjs';
import {resolveCourtAlias as cronAlias} from '../supabase/functions/blackhole-hermes-scan/core.mjs';
import {resolveCourtAlias as edgeAlias} from '../supabase/functions/infinitum-judicial-query/core.mjs';
const cases=[
 ['3002816-74.2026.8.06.0154','tjce'],
 ['0411964-57.2026.3.00.0000','stj'],
 ['0123456-88.2026.5.00.0000','tst']
];
test('all production paths route the same CNJ to the correct official tribunal alias',()=>{
 for(const fn of [webAlias,cronAlias,edgeAlias])for(const [cnj,alias] of cases)assert.equal(fn(cnj),alias);
});
test('CNJ/STF must not be looked up in the STJ index',()=>{
 for(const fn of [webAlias,cronAlias,edgeAlias]){
  assert.throws(()=>fn('0200043-65.2009.2.00.0000'),/Tribunal|disponível|DataJud/);
  assert.throws(()=>fn('0000000-00.2026.1.00.0000'),/Tribunal|disponível|DataJud/);
 }
});
