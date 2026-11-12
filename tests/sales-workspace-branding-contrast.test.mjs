import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{dashboardMetrics}from '../lib/dashboard-charts.mjs';
import{validateAppearance,validateImageFile,APP_COLORS}from '../lib/appearance-settings.mjs';
import{CRM_THEMES,contrastRatio}from '../lib/crm-themes.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clients=[
 {id:'1',name:'A',institution:'Bradesco',workflow_status:'ativo',due_override:'2026-11-01',priority_level:'urgente'},
 {id:'2',name:'B',institution:'Bradesco',workflow_status:'ativo',due_override:'2026-11-09',priority_level:'alta'},
 {id:'3',name:'C',institution:'Caixa',workflow_status:'ativo',due_override:'2026-11-21',priority_level:'normal'},
 {id:'4',name:'D',institution:'Caixa',workflow_status:'finalizado',due_override:'2024-01-01',priority_level:'urgente'},
 {id:'5',name:'E',institution:'Itaú',workflow_status:'ativo',priority_level:'normal'}
];
test('dashboard chart groups are real and never mix finished clients with overdue',()=>{
 const chart=dashboardMetrics(clients,'2026-11-09');
 assert.equal(chart.total,5);assert.equal(chart.active,4);assert.equal(chart.finalized,1);
 assert.equal(chart.statuses.find(x=>x.code==='vencido').value,1);
 assert.equal(chart.statuses.find(x=>x.code==='hoje').value,1);
 assert.equal(chart.statuses.find(x=>x.code==='sem_data').value,1);
 assert.equal(chart.banks[0].label,'Bradesco');assert.equal(chart.banks[0].value,2);
 assert.equal(chart.banks.reduce((a,x)=>a+x.value,0),4);
 assert.equal(chart.urgents,1);
});
test('appearance uses three independently editable text roles, validated against surface and custom page',()=>{
 const theme=CRM_THEMES.find(x=>x.id==='vinho');
 const valid=validateAppearance({page:'#fefdfd',primary:'#38202a',secondary:'#594452',tertiary:'#66505a'},theme);
 assert.equal(valid.page,'#fefdfd');assert.equal(valid.primary,'#38202a');
 for(const key of APP_COLORS){assert.ok(contrastRatio(valid[key],theme.surface)>=4.5);}
 assert.throws(()=>validateAppearance({primary:'#ffffff'},theme),/contraste/i);
 assert.throws(()=>validateAppearance({page:'#fff'},theme),/cor/i);
 assert.throws(()=>validateAppearance({tertiary:'#777777',page:'#777777'},theme),/contraste/i);
});
test('brand and background image picker validates size and MIME',()=>{
 assert.ok(validateImageFile({type:'image/png',size:18000},'logo'));
 assert.ok(validateImageFile({type:'image/webp',size:700000},'background'));
 assert.throws(()=>validateImageFile({type:'image/svg+xml',size:400},'logo'),/JPG|PNG|WebP/);
 assert.throws(()=>validateImageFile({type:'image/jpeg',size:8000000},'logo'),/MB/);
});
test('institution logo can use uploaded image instead of guessing brand, preserving fallback',()=>{
 const logo=file('components/institution-logo.jsx');
 assert.match(logo,/customUrl/);assert.match(logo,/reference-institution-fallback/);
 const ui=file('components/reference-pages.jsx');assert.match(ui,/onEditInstitution/);
 const legacy=file('components/reference-pages.jsx');assert.match(legacy,/InstitutionLogo/);
 assert.match(home,/logo_path/);
 const sql=file('supabase/migrations/20261109_014_branding_storage.sql');
 assert.match(sql,/logo_path/);assert.match(sql,/crm-institution-logos/);assert.match(sql,/create policy crm_institution_logos_select/);
 assert.match(sql,/create policy crm_backgrounds_select_own/);
});
test('task queue is a two-column Salesforce-style contact workspace with focus panel',()=>{
 const ui=file('app/tarefas/page.jsx');
 const css=file('app/sales-workspace.css');
 assert.match(ui,/sales-workspace/);assert.match(ui,/sales-contact-card/);assert.match(ui,/sales-contact-focus/);
 assert.match(ui,/Registrar atendimento/);assert.match(ui,/startNote/);
 assert.match(css,/grid-template-columns/);assert.match(css,/--ui-ink/);
});
test('overview includes actual charts for statuses, bank distribution and follow-up horizon',()=>{
 const ui=file('components/reference-pages.jsx'),css=file('app/dashboard-charts.css');
 assert.match(ui,/DashboardCharts/);
 assert.match(css,/dashboard-chart/);
 assert.match(css,/var\(--ui-/);
});
test('report hero and PDF enforce explicit high contrast regardless of theme overrides',()=>{
 const css=file('app/report-print.css')+'\n'+file('app/visual-overrides.css');
 assert.match(css,/html\[data-crm-theme\].*report-executive-hero h2/);
 assert.match(css,/pdf-cover-main h1/);
 assert.match(css,/pdf-page:not\(\.pdf-cover\)/);
 assert.match(css,/print-color-adjust/);
});
test('custom appearance stored in user settings and applied across all sections',()=>{
 const settings=file('app/configuracoes/page.jsx'),shell=file('components/crm-shell.jsx');
 assert.match(settings,/Cor primária do texto/);assert.match(settings,/Cor secundária do texto/);
 assert.match(settings,/Cor terciária do texto/);assert.match(settings,/Imagem de fundo/);
 assert.match(shell,/applyAppearanceToDocument/);assert.match(shell,/crm_background_path/);
});
