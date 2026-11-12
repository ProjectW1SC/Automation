-- Memória oficial de consultas judiciais: aditiva, sem modificar clientes/processos.
create table if not exists public.crm_judicial_snapshots (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 process_number text not null check (process_number ~ '^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$'),
 source text not null check(source in ('datajud','djen')),
 query_key text not null default 'latest',
 checked_at timestamptz not null default now(),
 found boolean not null default false,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=1000000),
 unique(actor_id,process_number,source,query_key)
);
create index if not exists crm_judicial_snapshots_process_idx on public.crm_judicial_snapshots(process_number,checked_at desc);
create index if not exists crm_judicial_snapshots_time_idx on public.crm_judicial_snapshots(checked_at desc);
alter table public.crm_judicial_snapshots enable row level security;
revoke all on public.crm_judicial_snapshots from public,anon;
grant select,insert,update on public.crm_judicial_snapshots to authenticated;
create policy crm_judicial_read on public.crm_judicial_snapshots for select to authenticated
 using (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 );
create policy crm_judicial_insert on public.crm_judicial_snapshots for insert to authenticated
 with check (
  actor_id=(select auth.uid()) and
  (lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 );
create policy crm_judicial_update on public.crm_judicial_snapshots for update to authenticated
 using (actor_id=(select auth.uid()) and (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)))
 with check (actor_id=(select auth.uid()) and (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)));
comment on table public.crm_judicial_snapshots is 'Consultas DataJud/DJEN registradas sem supor movimentações, audiências ou decisões não confirmadas.';
