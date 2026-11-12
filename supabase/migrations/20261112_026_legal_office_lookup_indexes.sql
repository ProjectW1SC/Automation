-- BLACKHOLE: índices de acesso por usuário, fase e datas.
-- Mantém os dados; não altera carteira, prazos, nomes ou permissões.
create index if not exists office_cases_owner_updated_lookup
 on public.office_cases(owner_id,updated_at desc);
create index if not exists office_cases_owner_cnj_lookup
 on public.office_cases(owner_id,process_number);
create index if not exists office_clients_owner_name_lookup
 on public.office_clients(owner_id,name);
create index if not exists office_deadlines_owner_due_lookup
 on public.office_deadlines(owner_id,due_on);
create index if not exists office_workflow_cards_owner_stage_lookup
 on public.office_workflow_cards(owner_id,stage,updated_at desc);
create index if not exists office_whatsapp_messages_owner_created_lookup
 on public.office_whatsapp_messages(owner_id,created_at desc);
create index if not exists office_agent_runs_owner_created_lookup
 on public.office_agent_runs(owner_id,created_at desc);
create index if not exists office_scan_runs_actor_checked_lookup
 on public.office_scan_runs(actor_id,checked_at desc);
create index if not exists crm_leads_owner_created_lookup
 on public.crm_leads(owner_id,created_at desc);
-- Não há chamadores da RPC abaixo. Retira um SECURITY DEFINER exposto
-- para que atores autenticados não consigam injetar falsos bloqueios globais.
drop function if exists public.record_office_source_cooldown(text,integer);
