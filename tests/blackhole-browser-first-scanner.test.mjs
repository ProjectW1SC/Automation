import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('scanner manual e automático foreground usam as duas APIs pelo navegador antes do servidor',()=>{
 const page=read('app/scanner/page.jsx');
 assert.match(page,/browseOfficialDataJudNumber/);
 assert.match(page,/browseOfficialDjenNumber/);
 assert.match(page,/browserResults/);
 assert.match(page,/run\(next,'foreground'\)/);
 assert.match(page,/Consultar DataJud pelo meu navegador/);
 assert.match(page,/Consultar DJEN pelo meu navegador/);
});
test('scanner API valida e persiste resultado direto, mas não contorna 403/429',()=>{
 const route=read('app/api/scanner/route.js');
 assert.match(route,/validateBrowserOfficialResult/);
 assert.match(route,/browserResultNeedsServerFallback/);
 assert.match(route,/browserResults/);
 assert.match(route,/office_scan_runs/);
 assert.match(route,/record_office_source_cooldown/);
});
test('consulta manual de Processos integra DataJud browser-first e salva snapshot com RLS',()=>{
 const office=read('components/office-console.jsx');
 const history=read('lib/judicial-history-client.mjs');
 assert.match(office,/fetchDataJudBrowser/);
 assert.match(office,/saveBrowser/);
 assert.match(office,/crm_judicial_snapshots/);
 assert.match(history,/fetchDataJudBrowser/);
 assert.match(history,/cacheOnly/);
});
test('consulta cache-only nunca aciona tribunal nem cria cooldown',()=>{
 const route=read('app/api/processos/consulta/route.js');
 const consult=route.slice(route.indexOf('async function consultOne'));
 assert.match(consult,/cacheOnly/);
 assert.match(consult,/cache_miss/);
 assert.ok(consult.indexOf('if(cacheOnly)')<consult.indexOf('let result;'));
});
