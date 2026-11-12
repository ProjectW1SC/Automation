import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_AREAS} from '../lib/crm-navigation.mjs';
import {periodBounds,buildReport,filterManualActivities,exportReportCsv} from '../lib/report.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('client details never render an undefined UserRound icon',()=>{
 const file=read('components/reference-pages.jsx');
 assert.match(file,/\bUserRound\b/);
 assert.match(file,/import\s*\{[^}]*\bUserRound\b[^}]*\}\s*from\s*'lucide-react'/);
});
test('report is a single authenticated area in the ProjectW1SC shell',()=>{
 assert.equal(CRM_AREAS.filter(x=>x.label==='Relatórios').length,1);
 assert.equal(CRM_AREAS.find(x=>x.label==='Relatórios').path,'/relatorios');
 const page=read('app/relatorios/page.jsx');
 assert.match(page,/OfficeConsole/);
 const console=read('components/office-console.jsx');
 assert.match(console,/office_deadlines/);
 assert.match(console,/office_agent_runs/);
 assert.match(console,/officeMiniReview/);
});
test('sidebar has responsive compact rail and accessible expansion controls',()=>{
 const component=read('components/crm-shell.jsx');
 const css=read('app/reference-design.css');
 assert.match(component,/sidebarExpanded/);
 assert.match(component,/onMouseEnter/);
 assert.match(component,/onMouseLeave/);
 assert.match(component,/onFocusCapture/);
 assert.match(component,/aria-expanded/);
 assert.match(component,/onPointerDown/);
 assert.match(css,/\.app-shell\.sidebar-expanded/);
 assert.match(css,/\.app-sidebar/);
 assert.match(css,/@media\s*\(max-width:\s*780px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
test('periods use local calendar dates and include start/exclude next day',()=>{
 assert.deepEqual(periodBounds('mes','2026-11-09'),{start:'2026-11-01',endExclusive:'2026-12-01'});
 assert.deepEqual(periodBounds('esta_semana','2026-11-09'),{start:'2026-11-09',endExclusive:'2026-11-16'});
 assert.deepEqual(periodBounds('semana_passada','2026-11-09'),{start:'2026-11-02',endExclusive:'2026-11-09'});
});
test('report counts manual work only, ignores imported audit rows as contacts',()=>{
 const clients=[
  {id:'a',workflow_status:'ativo',next_return:'2026-11-01',source_conflict:true,evidence_status:'sem_validacao'},
  {id:'b',workflow_status:'finalizado',next_return:'2026-10-01',source_status:'quitado_na_planilha',evidence_status:'sem_validacao'},
  {id:'c',workflow_status:'ativo',next_return:'2026-11-12',evidence_status:'quitacao_verificada'}
 ];
 const audit=[
  {id:'1',client_id:'a',kind:'conciliacao',created_at:'2026-11-09T08:00:00Z'},
  {id:'2',client_id:'a',kind:'atendimento',created_at:'2026-11-09T10:00:00Z'},
  {id:'3',client_id:'a',kind:'atendimento',created_at:'2026-10-31T10:00:00Z'}
 ];
 const manual=[{id:'x',actor_id:'user1',client_id:'a',category:'atendimento',contact_confirmed:true,performed_on:'2026-11-09'},
  {id:'y',actor_id:'user2',client_id:'c',category:'sistema',contact_confirmed:false,performed_on:'2026-11-09'}];
 const report=buildReport({clients,audit,manual,today:'2026-11-09',period:'mes'});
 assert.equal(report.portfolio.total,3);
 assert.equal(report.portfolio.active,2);
 assert.equal(report.portfolio.overdue,1);
 assert.equal(report.portfolio.finalized,1);
 assert.equal(report.portfolio.verified,1);
 assert.equal(report.period.attendances,1);
 assert.equal(report.period.manualActivities,2);
 assert.equal(report.period.contactsConfirmed,1);
 assert.equal(report.period.clientsContacted,1);
 assert.equal(report.period.sourceConflicts,1);
});
test('my activities are filtered by authenticated owner without changing portfolio total',()=>{
 const records=[{actor_id:'a',id:1},{actor_id:'b',id:2},{actor_id:'a',id:3}];
 assert.deepEqual(filterManualActivities(records,'a').map(x=>x.id),[1,3]);
});
test('export CSV escapes spreadsheet formulas, avoids client personal data by default',()=>{
 const csv=exportReportCsv({portfolio:{total:2,active:1,finalized:1,overdue:0,verified:0},period:{attendances:0,manualActivities:0,contactsConfirmed:0,clientsContacted:0,sourceConflicts:0},daily:[]});
 assert.match(csv,/\uFEFF/);
 assert.doesNotMatch(csv,/CPF|telefone|e-mail/i);
});
