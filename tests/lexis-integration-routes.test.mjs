import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('prazos e audiências usam o banco principal e não voltam à tabela legada vazia',()=>{
 const console=src('components/office-console.jsx');
 assert.match(console,/\['deadlines','audiencias'\]\.includes\(area\)/);
 assert.match(console,/<LexisOperations area=\{area\}/);
 const operations=src('components/lexis-operations.jsx');
 const sources=src('lib/lexis-company-data.mjs');
 assert.match(operations,/loadLexisCompanySources/);
 for(const name of ['processos','audiencias_monitoradas','crm_tarefas','office_deadlines']){
  assert.ok(sources.includes("'"+name+"'"),'fonte Lexis ausente: '+name);
 }
 assert.match(sources,/\.eq\('empresa_id',company\)/);
 assert.match(sources,/\.range\(from,from\+pageSize-1\)/);
});
test('agenda suporta retornos, prazos e audiências no tema Infinitum',()=>{
 const agenda=src('app/agenda/page.jsx');
 assert.match(agenda,/NEXT_PUBLIC_LEXIS_SHARED_DB/);
 assert.match(agenda,/<LexisOperations area="agenda"/);
 const css=src('app/lexis-infinitum-theme.css');
 assert.match(css,/\.lx-calendar-day/);
 assert.match(css,/\.lx-status--vencido/);
 assert.match(css,/\.lx-status--atencao/);
 assert.match(css,/\.lx-status--em_dia/);
 assert.match(css,/\.lx-status--encerrado/);
 assert.match(src('app/layout.jsx'),/import '\.\/lexis-infinitum-theme.css'/);
});
test('/report mantém PDF original, mas lê processos Lexis em páginas',()=>{
 const report=src('app/report/page.jsx');
 assert.match(report,/from\('processos'\)/);
 assert.match(report,/adaptLexisToExecutiveReport/);
 assert.match(report,/<ReportPrintDocument/);
 assert.match(report,/return <LegacyReportPage\/>/);
});
test('cartão de processos não expõe UUID do responsável e mostra prazo e retorno',()=>{
 const s=src('components/lexis-shared-office.jsx');
 assert.match(s,/responsibleDisplay\(p.last_responsible,team\)/);
 assert.match(s,/p.next_deadline/);
 assert.match(s,/statusForDate\(p.next_attendance/);
 assert.match(s,/lx-process-record/);
});
