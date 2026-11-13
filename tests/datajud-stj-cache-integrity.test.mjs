import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {dataJudSnapshotIsFromCourt} from '../lib/processos-oficiais.mjs';
const stj='0411964-57.2026.3.00.0000';
test('wrong TST-index cached response for STJ can never be shown as verified data',()=>{
 assert.equal(dataJudSnapshotIsFromCourt({court:'TST',found:false},stj),false);
 assert.equal(dataJudSnapshotIsFromCourt({court:'STJ',found:false},stj),true);
 assert.equal(dataJudSnapshotIsFromCourt({meta:{court:'STJ'}},stj),true);
 assert.equal(dataJudSnapshotIsFromCourt({},stj),false);
});
test('both new judicial engines persist an explicit court even for a no-hit DataJud query',()=>{
 for(const path of ['supabase/functions/infinitum-judicial-query/index.ts','supabase/functions/blackhole-hermes-scan/index.ts']){
  const src=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(src,/court:alias\.toUpperCase\(\)/,path);
 }
});
test('cached and fallback DataJud responses pass alias cross-check before reuse',()=>{
 const src=readFileSync(new URL('../app/api/processos/consulta/route.js',import.meta.url),'utf8');
 assert.match(src,/dataJudSnapshotIsFromCourt\(rawCached\.payload,number\)/);
 assert.match(src,/dataJudSnapshotIsFromCourt\(historical\.data\.payload,number\)/);
});
