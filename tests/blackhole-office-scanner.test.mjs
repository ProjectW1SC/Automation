import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import {buildScannerReview,sourceSummary,selectScannerCases} from '../lib/blackhole-office-scanner.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const cnj='1001218-36.2026.5.02.0040';
test('scanner usa as duas fontes independentemente; DJEN bloqueado não invalida movimento DataJud',()=>{
 const r=sourceSummary({datajud:{ok:true,source:'DataJud',found:true,items:[{date:'2026-11-10',source:'DataJud',title:'Movimentação'}]},djen:{ok:false,error:'A fonte oficial bloqueou esta rede (HTTP 403).'}});
 assert.equal(r.datajud.status,'confirmed');assert.equal(r.djen.status,'blocked_403');
 assert.equal(r.complete,false);assert.equal(r.partial,true);
});
test('scanner só gera alertas sobre fatos textuais efetivos e datas futuras',()=>{
 const s=[{source:'datajud',process_number:cnj,checked_at:'2026-11-12T12:00:00Z',payload:{items:[{source:'DataJud',date:'2026-11-11',title:'Audiência de instrução designada em 18/11/2026 às 14:30',description:'Juízo marcou audiência.'},{source:'DataJud',date:'2026-11-10',title:'Sentença',description:'Julgo parcialmente procedentes os pedidos.'}]}}];
 const r=buildScannerReview(s,{today:'2026-11-12'});
 assert.equal(r.hearings.length,1);assert.equal(r.hearings[0].date,'2026-11-18');
 assert.equal(r.verdicts.length,1);assert.match(r.verdicts[0].classification,/parcial/i);
 assert.ok(r.nextReturnDays>0&&r.nextReturnDays<=15);
 assert.match(r.disclaimer,/revis/i);
});
test('scanner não inventa conclusão sobre ausência de movimento ou prazo judicial',()=>{
 const r=buildScannerReview([],{today:'2026-11-12'});
 assert.deepEqual(r.hearings,[]);assert.deepEqual(r.verdicts,[]);
 assert.equal(r.confirmedOfficialEvents,0);assert.match(r.disclaimer,/prazo judicial/i);
});
test('seleção sanitiza e limita lote por vez',()=>{
 const items=Array.from({length:20},(_,i)=>({id:String(i),process_number:cnj}));
 assert.equal(selectScannerCases(items,5).length,1);
 assert.equal(selectScannerCases([{process_number:''},{process_number:'invalido'}],5).length,0);
});
test('API usa autenticação Supabase, consulta DJEN e DataJud e grava trilha RLS',()=>{
 const api=read('app/api/scanner/route.js'),migration=read('supabase/migrations/20261112_023_official_scanner.sql');
 assert.match(api,/checkCrmAccess/);assert.match(api,/checkOne\(number,'datajud'/);assert.match(api,/checkOne\(number,'djen'/);
 assert.match(api,/office_scan_runs/);assert.match(migration,/enable row level security/);assert.match(migration,/revoke all .* from public,anon/i);
});
test('navegação mostra scanner independente, agentes reusam evidências',()=>{
 const nav=read('lib/crm-navigation.mjs'),page=read('app/scanner/page.jsx');
 assert.match(nav,/Scanner judicial/);
 assert.match(page,/SecuredWorkspace/);assert.match(page,/api\/scanner/);
 assert.match(page,/DataJud/);assert.match(page,/DJEN/);
});

test('demonstração nunca conta 8 atos fictícios como publicações oficiais confirmadas',()=>{
 const fake=[{process_number:cnj,source:'djen',payload:{demo:true,official:false,items:[{source:'DJEN',date:'2026-11-10',title:'Audiência designada em 18/11/2026 às 13:00'},{source:'DJEN',date:'2026-11-09',title:'Sentença: julgo procedente'}]}}];
 const review=buildScannerReview(fake,{today:'2026-11-13'});
 assert.equal(review.confirmedOfficialEvents,0);assert.equal(review.hearings.length,0);assert.equal(review.verdicts.length,0);
 const summary=sourceSummary({djen:{ok:true,demo:true,items:fake[0].payload.items,found:true},datajud:{ok:false,error:'Indisponível'}});
 assert.equal(summary.djen.status,'simulated');assert.equal(summary.djen.count,null);
 assert.equal(summary.djen.simulatedCount,2);assert.equal(summary.complete,false);
});
