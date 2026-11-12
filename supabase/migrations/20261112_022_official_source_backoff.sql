-- Controle de bloqueio de fontes oficiais por operador, para não insistir em rede 403/429.
create table if not exists public.office_official_backoff(
 actor_id uuid not null references auth.users(id),
 process_number text not null,
 source text not null check(source in ('djen','datajud')),
 status integer not null check(status in (403,429)),
 failed_at timestamptz not null default now(),
 retry_after timestamptz not null,
 primary key(actor_id,process_number,source)
);
create index if not exists office_official_backoff_retry_idx on public.office_official_backoff(retry_after);
alter table public.office_official_backoff enable row level security;
revoke all on public.office_official_backoff from public,anon;
grant select,insert,update,delete on public.office_official_backoff to authenticated;
create policy office_official_backoff_read on public.office_official_backoff for select to authenticated
 using(public.office_has_access() and actor_id=(select auth.uid()));
create policy office_official_backoff_insert on public.office_official_backoff for insert to authenticated
 with check(public.office_has_access() and actor_id=(select auth.uid()));
create policy office_official_backoff_update on public.office_official_backoff for update to authenticated
 using(public.office_has_access() and actor_id=(select auth.uid()))
 with check(public.office_has_access() and actor_id=(select auth.uid()));
create policy office_official_backoff_delete on public.office_official_backoff for delete to authenticated
 using(public.office_has_access() and actor_id=(select auth.uid()));
comment on table public.office_official_backoff is 'Evita insistir em respostas 403/429. Fallback DataJud não prova publicações DJEN.';
