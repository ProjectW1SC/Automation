import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACTIVITY_CATEGORIES,validateCompletedActivity,activitySummary,paginateActivities} from '../lib/minhas-atividades.mjs';
import {CRM_AREAS,crmAreaHref} from '../lib/crm-navigation.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('new judicial areas share the original CRM shell',()=>{
 assert.deepEqual(CRM_AREAS.map(a=>a.label),['Painel jurídico','Clientes','Processos','Prazos','Fluxos (POP)','Audiências','Peças e petições','WhatsApp','Leads','Gerador de processos','Superagente','Mini Agentes','Relatórios','Integrações','Configurações']);
 assert.equal(crmAreaHref('Mini Agentes'),'/agentes');
 const shell=file('components/crm-shell.jsx');
 assert.match(shell,/blackhole-logo\.svg/);
 assert.match(shell,/CRM_AREAS/);
 assert.match(shell,/CrmShell/);
});
test('copies Lexis completed task categories and rejects fabricated contact',()=>{
 assert.ok(ACTIVITY_CATEGORIES.some(x=>x.value==='atendimento'));
 assert.ok(ACTIVITY_CATEGORIES.some(x=>x.value==='analise_processual'));
 assert.throws(()=>validateCompletedActivity({title:'A',category:'atendimento',date:'2026-11-09'},'2026-11-09'),/título/i);
 assert.throws(()=>validateCompletedActivity({title:'Contato telefônico',category:'sistema',date:'2026-11-09',contactConfirmed:true},'2026-11-09'),/contato/i);
});
test('completed activity date must be real and not future',()=>{
 assert.throws(()=>validateCompletedActivity({title:'Atualizei informações',category:'planilha',date:'2026-12-01'},'2026-11-09'),/futura/i);
 assert.throws(()=>validateCompletedActivity({title:'Atualizei informações',category:'planilha',date:'2026-02-30'},'2026-11-09'),/data/i);
 const a=validateCompletedActivity({title:'  Atualizei a planilha  ',category:'planilha',date:'2026-11-08',description:'  registros  ',clientId:null},'2026-11-09');
 assert.equal(a.title,'Atualizei a planilha');
 assert.equal(a.description,'registros');
});
test('history excludes activities of other executors',()=>{
 const records=[{id:'a',actor_id:'user-1',client_id:'c1',category:'atendimento',contact_confirmed:true},{id:'b',actor_id:'user-2',client_id:'c2',category:'auditoria',contact_confirmed:false},{id:'c',actor_id:'user-1',client_id:null,category:'planilha',contact_confirmed:false}];
 const summary=activitySummary(records,'user-1');
 assert.deepEqual({total:summary.total,contacts:summary.contacts,clients:summary.clients,withoutClient:summary.withoutClient},{total:2,contacts:1,clients:1,withoutClient:1});
 assert.equal(paginateActivities(records.filter(r=>r.actor_id==='user-1'),1,1).rows.length,1);
});
test('visual references remain a functioning UI not a static screenshot',()=>{
 const css=file('app/reference-design.css');
 assert.match(css,/\.reference-dashboard/);
 assert.match(css,/\.reference-client-grid/);
 assert.match(css,/\.app-sidebar/);
 assert.match(css,/prefers-reduced-motion/);
 const ui=file('app/minhas-atividades/page.jsx');
 assert.match(ui,/db\.from\('crm_completed_activities'\)/);
 assert.match(ui,/CrmShell/);
 assert.match(ui,/Registrar atividade/);
 const main=file('app/page.jsx');
 assert.match(main,/OfficeConsole/);
 assert.match(file('components/office-console.jsx'),/office_clients/);
 assert.match(file('components/reference-pages.jsx'),/reference-client-grid/);
});
test('Supabase completed activity storage enforces RLS and binds actor identity',()=>{
 const migration=file('supabase/migrations/20261109_006_minhas_atividades.sql');
 assert.match(migration,/enable row level security/i);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/actor_id/);
 assert.doesNotMatch(migration,/security definer/i);
});
