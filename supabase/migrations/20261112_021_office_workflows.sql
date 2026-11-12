-- Fluxo de trabalho JURÍDICO. Sem importação automática dos dados da empresa terceira.
create table if not exists public.office_workflow_cards(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 case_id uuid references public.office_cases(id) on delete set null,
 title text not null check(length(btrim(title)) between 3 and 220),
 description text not null default '' check(length(description)<=2000),
 stage text not null default 'entrada' check(stage in ('entrada','triagem','producao','revisao','concluido')),
 card_type text not null default 'tarefa' check(card_type in ('tarefa','processo','peca','lead','outro')),
 priority text not null default 'normal' check(priority in ('normal','alta','urgente')),
 due_on date,
 assigned_to text,
 source text not null default 'manual' check(source in ('manual','infinitum_authorized')),
 external_ref text check(external_ref is null or length(external_ref)<=180),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists office_workflow_stage_idx on public.office_workflow_cards(stage,priority,updated_at desc);
create index if not exists office_workflow_case_idx on public.office_workflow_cards(case_id) where case_id is not null;
alter table public.office_workflow_cards enable row level security;
revoke all on public.office_workflow_cards from public,anon;
grant select,insert,update,delete on public.office_workflow_cards to authenticated;
create policy office_workflow_read on public.office_workflow_cards for select to authenticated using(public.office_has_access());
create policy office_workflow_insert on public.office_workflow_cards for insert to authenticated with check(public.office_has_access() and owner_id=(select auth.uid()));
create policy office_workflow_update on public.office_workflow_cards for update to authenticated
 using(public.office_has_access() and (owner_id=(select auth.uid()) or public.office_is_admin()))
 with check(public.office_has_access() and (owner_id=(select auth.uid()) or public.office_is_admin()));
create policy office_workflow_delete on public.office_workflow_cards for delete to authenticated
 using(public.office_is_admin());
comment on table public.office_workflow_cards is 'Kanban jurídico próprio de cinco etapas; origin manual não duplica a ferramenta Infinitum.';
