-- Trilhas auditáveis, sem apagar clientes nem modificar prazos/andamentos por inferência.
create table if not exists public.office_scan_runs(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null default auth.uid() references auth.users(id),
 process_number text not null check(process_number ~ '^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$'),
 trigger_mode text not null default 'manual' check(trigger_mode in ('manual','foreground')),
 source_status jsonb not null default '{}'::jsonb check(pg_column_size(source_status)<16000),
 review jsonb not null default '{}'::jsonb check(pg_column_size(review)<64000),
 checked_at timestamptz not null default now()
);
create index if not exists office_scan_runs_number_recent_idx on public.office_scan_runs(process_number,checked_at desc);
create index if not exists office_scan_runs_actor_recent_idx on public.office_scan_runs(actor_id,checked_at desc);
alter table public.office_scan_runs enable row level security;
revoke all on public.office_scan_runs from public,anon;
grant select,insert on public.office_scan_runs to authenticated;
create policy office_scan_runs_read on public.office_scan_runs for select to authenticated
 using(public.office_has_access());
create policy office_scan_runs_insert on public.office_scan_runs for insert to authenticated
 with check(public.office_has_access() and actor_id=(select auth.uid()));
comment on table public.office_scan_runs is 'Resultado comprovável por fonte de scanner no BLACKHOLE. Uma falha 403/429 não vira movimento/ausência de processo.';
