import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261112_026_legal_office_lookup_indexes.sql',import.meta.url),'utf8');
test('acesso de escritório, histórico, prazos e Kanban estão indexados por proprietário',()=>{
 for(const name of ['office_cases','office_clients','office_deadlines','office_workflow_cards',
  'office_agent_runs','office_scan_runs','office_whatsapp_messages','crm_leads'])
  assert.match(sql,new RegExp('on public\\\\.'+name+'\\\\('));
 assert.match(sql,/drop function if exists public\.record_office_source_cooldown/);
});
