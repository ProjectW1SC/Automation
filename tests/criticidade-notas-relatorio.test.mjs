import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_THEMES,resolveTheme,contrastRatio} from '../lib/crm-themes.mjs';
import {priorityDigest,limitSnippet,priorityLabel} from '../lib/report-priority.mjs';
import {sortTaskQueue,validateCriticidade,validateNote} from '../lib/tarefas.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clients=[
 {id:'closed',name:'Cliente encerrado',workflow_status:'finalizado',priority_level:'urgente',due_override:'2023-01-01'},
 {id:'late',name:'Cliente vencido',workflow_status:'ativo',priority_level:'urgente',due_override:'2026-01-10',notes:'Nota do cadastro'},
 {id:'today',name:'Cliente de hoje',workflow_status:'ativo',priority_level:'alta',due_override:'2026-11-09'},
 {id:'future',name:'Cliente com retorno',workflow_status:'ativo',priority_level:'normal',due_override:'2026-12-01'}
];
test('ranked report only includes active clients, exactly first 10 in task queue order',()=>{
 const data=[...clients,...Array.from({length:15},(_,i)=>({id:'x'+i,name:'Novo '+i,workflow_status:'ativo',priority_level:'normal',due_override:'2026-12-20'}))];
 const digest=priorityDigest({clients:data,today:'2026-11-09'});
 assert.equal(digest.length,10);
 assert.equal(digest[0].id,'late');
 assert.deepEqual(digest.map(x=>x.id),sortTaskQueue(data.filter(x=>x.workflow_status!=='finalizado'),'2026-11-09').slice(0,10).map(x=>x.id));
 assert.ok(digest.every(x=>x.id!=='closed'));
 assert.equal(priorityLabel('urgente'),'Urgente');
});
test('priority report includes the latest annotation and latest recorded work, not invented activities',()=>{
 const d=priorityDigest({clients,
  audit:[
   {client_id:'late',kind:'anotacao',body:'Anotação mais antiga',created_at:'2026-11-07T12:00:00Z'},
   {client_id:'late',kind:'anotacao',body:'Atualização verificada por telefone',created_at:'2026-11-08T13:00:00Z'},
   {client_id:'late',kind:'atendimento',body:'Contato com cliente',created_at:'2026-11-09T10:00:00Z'},
  ],
  manual:[{client_id:'late',title:'Análise processual',description:'Petição examinada',performed_on:'2026-11-05',created_at:'2026-11-05T09:00:00Z'}],
  today:'2026-11-09'});
 assert.equal(d[0].note,'Atualização verificada por telefone');
 assert.equal(d[0].lastActivity,'Contato com cliente');
 assert.equal(d[0].noteAt,'2026-11-08T13:00:00Z');
 assert.equal(d[0].activitySource,'Atendimento');
 assert.equal(d.find(x=>x.id==='today').note,'');
 assert.equal(d.find(x=>x.id==='future').lastActivity,'');
});
test('notes fall back to existing client notes and completed activities if attendance is absent',()=>{
 const d=priorityDigest({clients,
  manual:[{client_id:'late',title:'Revisão documental',description:'Documentos analisados',performed_on:'2026-11-04',created_at:'2026-11-04T13:00:00Z'}],
  today:'2026-11-09'});
 assert.equal(d[0].note,'Nota do cadastro');
 assert.equal(d[0].lastActivity,'Revisão documental — Documentos analisados');
});
test('notes and criticidade are validated and bounded',()=>{
 assert.equal(validateCriticidade('alta'),'alta');
 assert.equal(validateCriticidade('URGENTE'),'urgente');
 assert.throws(()=>validateCriticidade('critica'),/criticidade/i);
 assert.equal(validateNote('   Aguardando retorno   '),'Aguardando retorno');
 assert.throws(()=>validateNote('a'),/anotação/i);
 assert.throws(()=>validateNote('x'.repeat(4001)),/4000/i);
 assert.equal(limitSnippet('Texto muito comprido',10),'Texto mui…');
});
test('completed status flag uses neutral gray in all themes',()=>{
 const ref=file('components/reference-pages.jsx'),css=file('app/crm-themes.css'),tasks=file('app/tarefas/page.jsx');
 assert.match(ref,/finalizado:\['finished','Finalizado'\]/);
 assert.match(css,/\.task-badge-finalizado/);
 assert.match(css,/--ui-neutral-bg/);
 assert.match(css,/--ui-neutral-ink/);
 assert.match(tasks,/Finalizado/);
});
test('Infinitum Light and Dark palettes meet WCAG AA contrast in ordinary and semantic labels',()=>{
 assert.equal(CRM_THEMES.length,2);
 assert.equal(new Set(CRM_THEMES.map(x=>x.id)).size,CRM_THEMES.length);
 assert.equal(resolveTheme('unknown'),'infinitum');
 for(const t of CRM_THEMES){
  for(const [fg,bg] of [['ink','surface'],['muted','surface'],['accentInk','accent'],['navInk','nav'],['tintInk','tint'],['neutralInk','neutralBg'],['dangerInk','dangerBg'],['warningInk','warningBg'],['successInk','successBg']]){
   assert.ok(contrastRatio(t[fg],t[bg])>=4.5,t.id+' '+fg+'/'+bg+' ratio '+contrastRatio(t[fg],t[bg]));
  }
 }
 const settings=file('app/settings.css');assert.match(settings,/settings-theme-grid/);
});
test('client editing, attendance and note-taking support editable criticidade',()=>{
 const tasks=file('app/tarefas/page.jsx');
 assert.match(tasks,/Nível de criticidade/g);
 assert.match(tasks,/crm_register_attendance_with_criticidade/);
 assert.match(tasks,/crm_add_client_note/);
 assert.match(tasks,/Anotação/);
 assert.match(tasks,/task-modal/);
 const office=file('components/office-console.jsx');
 assert.match(office,/office_deadlines/);
 assert.match(office,/priority/);
 assert.match(office,/notes/);
 const sql=file('supabase/migrations/20261109_013_criticidade_notas.sql');
 assert.match(sql,/security invoker/i);
 assert.match(sql,/crm_register_attendance_with_criticidade/);
 assert.match(sql,/crm_add_client_note/);
 assert.match(sql,/crm_register_attendance\(/);
 assert.match(sql,/crm_update_client\(/);
});
test('report includes 10 priority clients, source activities and notes on screen and printed PDF',()=>{
 const ui=file('app/report/page.jsx'),print=file('components/report-print-document.jsx'),css=file('app/report-print.css');
 assert.match(ui,/priorityDigest/);
 assert.match(ui,/crm_activities/);
 assert.match(ui,/crm_completed_activities/);
 assert.match(ui,/priorityDigestRows/);
 assert.match(print,/priorityDigestRows/);
 assert.match(print,/\bNota:/);
 assert.match(print,/\bAtividade:/);
 assert.match(print,/10 prioridades/);
 assert.match(css,/\.pdf-priority-row/);
 assert.match(css,/@page\s*\{[^}]*A4/s);
 assert.match(css,/page-break-after|break-after/);
});
