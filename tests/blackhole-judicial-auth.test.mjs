import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('veredito usa o mesmo guard de sessão e não inicia listener concorrente',()=>{
 const s=read('components/judicial-intelligence.jsx');
 assert.match(s,/SecuredWorkspace/);assert.match(s,/withAuthDeadline/);
 assert.doesNotMatch(s,/onAuthStateChange/);
});
test('audiências usam histórico oficial e continuam mantendo a agenda cadastrada',()=>{
 const ui=read('components/office-console.jsx');
 assert.match(ui,/BlackholeOfficialHearings/);
 assert.match(ui,/office_deadlines/);
 const h=read('components/blackhole-official-hearings.jsx');
 assert.match(h,/hearingCandidates/);assert.match(h,/crm_judicial_snapshots/);
});
