import test from'node:test';import assert from'node:assert/strict';
import {PUBLIC_DATAJUD_COURTS,buildDataJudDiscoveryQuery} from '../lib/blackhole-datajud-discovery.mjs';
import {buildDjenSearchURL} from '../lib/djen-generator.mjs';
test('gerador DataJud cobre 27 TJs, 6 TRFs, 24 TRTs e superiores',()=>{
 assert.ok(PUBLIC_DATAJUD_COURTS.length>=60);
 for(const name of ['TJAC','TJSP','TJDFT','TJRO','TRF6','TRT24','STJ','TST']){
  const r=buildDataJudDiscoveryQuery({term:'procedimento comum',court:name,page:2});
  assert.equal(r.payload.from,20);
  assert.ok(r.url.endsWith('_'+name.toLowerCase()+'/_search'));
 }
});
test('paginação é limitada e explícita nas buscas oficiais',()=>{
 assert.throws(()=>buildDataJudDiscoveryQuery({term:'procedimento comum',court:'TJSP',page:26}),/Página/);
 const u=buildDjenSearchURL({term:'procedimento comum',court:'TJSP',start:'2026-11-01',end:'2026-11-10',page:2});
 assert.match(u,/pagina=2/);
});
