-- Projeto ProjectW1SC - mesma lógica de tarefas realizadas do LexisPredict,
-- adaptada à base de negociações e vinculada ao executor autenticado.
create table if not exists public.crm_completed_activities (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null default auth.uid() references auth.users(id),
 client_id uuid null references public.crm_clients(id) on delete set null,
 title text not null check (char_length(btrim(title)) between 4 and 180),
 description text not null default '' check (char_length(description)<=4000),
 category text not null check (category in (
 'atendimento','analise_processual','auditoria','dossie','investigacao',
 'planilha','sistema','automacao','outro')),
 performed_on date not null check (performed_on>='2020-01-01'),
 contact_confirmed boolean not null default false,
 duration_seconds integer not null default 0 check(duration_seconds between 0 and 86400),
 origin text not null default 'registro_manual_autodeclarado',
 created_at timestamptz not null default now(),
 constraint crm_completed_activities_contact_check check (not contact_confirmed or category='atendimento'),
 constraint crm_completed_activities_origin_check check(origin='registro_manual_autodeclarado')
);
create index if not exists crm_completed_by_actor_date on public.crm_completed_activities(actor_id,performed_on desc,created_at desc);
create index if not exists crm_completed_by_client on public.crm_completed_activities(client_id);
alter table public.crm_completed_activities enable row level security;
drop policy if exists crm_completed_select_own on public.crm_completed_activities;
drop policy if exists crm_completed_insert_own on public.crm_completed_activities;
create policy crm_completed_select_own on public.crm_completed_activities
 for select to authenticated using (
 actor_id=(select auth.uid()) and (
 lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
 or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 ));
create policy crm_completed_insert_own on public.crm_completed_activities
 for insert to authenticated with check (
 actor_id=(select auth.uid()) and performed_on<=((now() at time zone 'America/Sao_Paulo')::date) and (
 lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
 or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 ));
revoke all on public.crm_completed_activities from anon;
grant select,insert on public.crm_completed_activities to authenticated;
