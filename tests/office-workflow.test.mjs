import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Kanban jurídico persiste etapas sob RLS e não publica dados anônimos',()=>{
 const sql=read('supabase/migrations/20261112_021_office_workflows.sql');
 assert.match(sql,/create table if not exists public\.office_workflow_cards/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.office_workflow_cards from public,anon/);
 assert.match(sql,/entrada.*triagem.*producao.*revisao.*concluido/);
});
test('interface faz movimentação real no banco; não simula sucesso',()=>{
 const ui=read('components/office-kanban.jsx');
 assert.match(ui,/from\('office_workflow_cards'\)/);
 assert.match(ui,/\.update\(\{stage:/);
 assert.match(ui,/dragstart|onDragStart/i);
 assert.match(ui,/error/);
});
