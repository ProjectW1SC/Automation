import test from 'node:test';import assert from 'node:assert/strict';
import{reconcileHermesScan}from'../lib/hermes-snapshot-reconciliation.mjs';
const c1='3002816-74.2026.8.06.0154',c2='0411964-57.2026.3.00.0000',owner='a';
const old={id:'scan1',actor_id:owner,process_number:c1,checked_at:'2026-11-12T19:47:23Z',source_status:{djen:{status:'blocked_403'},datajud:{status:'timeout'},complete:false},review:{returnReason:'Nenhuma movimentação confirmada.'}};
test('Hermes overlays later verified DJEN publications instead of claiming every source remained blocked',()=>{
 const result=reconcileHermesScan(old,[
  {actor_id:owner,process_number:c1,source:'djen',checked_at:'2026-11-13T08:38:03Z',found:true,payload:{source:'DJEN',items:[{date:'2026-10-14'}]}},
  {actor_id:owner,process_number:c1,source:'djen',checked_at:'2026-11-13T08:39:51Z',found:false,payload:{source:'DJEN',items:[]}}]);
 assert.equal(result.overlay.djen.state,'verified_after_scan');
 assert.equal(result.overlay.djen.publicationWindows,1);
 assert.equal(result.overlay.datajud.state,'historical_failure');
 assert.equal(result.hasNewerPublicationEvidence,true);
});
test('incorrect old STJ snapshot using TST index must never be treated as valid DataJud confirmation',()=>{
 const scan={...old,process_number:c2};
 const out=reconcileHermesScan(scan,[
  {actor_id:owner,process_number:c2,source:'datajud',checked_at:'2026-11-13T01:17:21Z',found:false,payload:{source:'DataJud',court:'TST',items:[]}},
  {actor_id:owner,process_number:c2,source:'djen',checked_at:'2026-11-13T01:16:54Z',found:true,payload:{source:'DJEN',items:[{date:'2026-11-11'}]}}]);
 assert.equal(out.overlay.datajud.state,'historical_failure');
 assert.equal(out.overlay.djen.publicationWindows,1);
 assert.equal(out.hasNewerPublicationEvidence,true);
});
test('snapshots of another CRM user cannot change a report, nor older snapshots',()=>{
 const result=reconcileHermesScan(old,[
  {actor_id:'different',process_number:c1,source:'djen',found:true,checked_at:'2026-11-13T08:38:03Z'},
  {actor_id:owner,process_number:c1,source:'djen',found:true,checked_at:'2026-11-11T08:38:03Z'}]);
 assert.equal(result.overlay.djen.state,'historical_failure');
});
test('a correct STJ result from the repaired source may supersede previous STJ DataJud failure',()=>{
 const result=reconcileHermesScan({...old,process_number:c2},[
  {actor_id:owner,process_number:c2,source:'datajud',checked_at:'2026-11-13T10:00:00Z',found:false,payload:{source:'DataJud',court:'STJ',items:[]}}]);
 assert.equal(result.overlay.datajud.state,'verified_after_scan');
 assert.equal(result.overlay.datajud.publicationWindows,0);
});
