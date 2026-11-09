-- CRM Processos: only owner may read/write CNJ records, no public access.
create table if not exists public.crm_processes (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 process_number text not null,
 process_type text not null check(process_type in ('comum','busca_apreensao')),
 client_id uuid references public.crm_clients(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(actor_id,process_number),
 constraint crm_processes_number_format check(process_number ~ '^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$')
);
create index if not exists crm_processes_owner_idx on public.crm_processes(actor_id,created_at desc);
alter table public.crm_processes enable row level security;
drop policy if exists crm_processes_select_own on public.crm_processes;
drop policy if exists crm_processes_insert_own on public.crm_processes;
drop policy if exists crm_processes_update_own on public.crm_processes;
drop policy if exists crm_processes_delete_own on public.crm_processes;
create policy crm_processes_select_own on public.crm_processes
 for select to authenticated using (
  actor_id=(select auth.uid()) and
  (lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
   or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 );
create policy crm_processes_insert_own on public.crm_processes
 for insert to authenticated with check (
  actor_id=(select auth.uid()) and
  (lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
   or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 );
create policy crm_processes_update_own on public.crm_processes
 for update to authenticated using(actor_id=(select auth.uid()))
 with check(actor_id=(select auth.uid()));
create policy crm_processes_delete_own on public.crm_processes
 for delete to authenticated using(actor_id=(select auth.uid()));
revoke all on public.crm_processes from anon;
grant select,insert,update,delete on public.crm_processes to authenticated;
comment on table public.crm_processes is 'CNJs do CRM (privados e vinculados ao usuário). Movimentações são consultadas sob demanda diretamente nas APIs oficiais CNJ.';
