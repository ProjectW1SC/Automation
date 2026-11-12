-- Hermes background scheduler: official public APIs only; no client secrets or auto-contact.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

alter table public.office_scan_runs
 drop constraint if exists office_scan_runs_trigger_mode_check;
alter table public.office_scan_runs
 add constraint office_scan_runs_trigger_mode_check
 check (trigger_mode = any (array['manual'::text,'foreground'::text,'scheduled'::text]));

create table if not exists public.office_source_cooldowns(
 source text primary key check(source in ('datajud','djen')),
 status integer not null check(status in (403,429)),
 failed_at timestamptz not null,
 retry_after timestamptz not null,
 updated_at timestamptz not null default now()
);
alter table public.office_source_cooldowns enable row level security;
revoke all on public.office_source_cooldowns from public,anon;
grant select on public.office_source_cooldowns to authenticated,service_role;
drop policy if exists office_source_cooldowns_read on public.office_source_cooldowns;
create policy office_source_cooldowns_read on public.office_source_cooldowns
 for select to authenticated using (public.office_has_access());

create table if not exists public.office_cron_guard(
 name text primary key check(name='hermes'),
 token_sha256 text not null check(token_sha256 ~ '^[a-f0-9]{64}$'),
 updated_at timestamptz not null default now()
);
alter table public.office_cron_guard enable row level security;
revoke all on public.office_cron_guard from public,anon,authenticated;
grant select on public.office_cron_guard to service_role;

create or replace function public.record_office_source_cooldown(p_source text,p_status integer)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null or not public.office_has_access() then
  raise exception 'Acesso não autorizado ao controle de fonte oficial.';
 end if;
 if p_source not in ('datajud','djen') or p_status not in (403,429) then
  raise exception 'Parâmetros de cooldown inválidos.';
 end if;
 insert into public.office_source_cooldowns(source,status,failed_at,retry_after,updated_at)
 values(p_source,p_status,now(),now()+case when p_status=403 then interval '20 minutes' else interval '15 minutes' end,now())
 on conflict(source) do update set status=excluded.status,failed_at=excluded.failed_at,
  retry_after=excluded.retry_after,updated_at=excluded.updated_at;
end;
$$;
revoke all on function public.record_office_source_cooldown(text,integer) from public,anon;
grant execute on function public.record_office_source_cooldown(text,integer) to authenticated;

-- Create the scheduler credential inside Vault; only its SHA-256 is stored in the guard table.
do $$
declare v_token text; v_id uuid;
begin
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 select id into v_id from vault.secrets where name='blackhole_hermes_cron_token' limit 1;
 if v_id is null then
  perform vault.create_secret(v_token,'blackhole_hermes_cron_token','Private bearer token for the BLACKHOLE Hermes background scheduler');
 else
  perform vault.update_secret(v_id,v_token,'blackhole_hermes_cron_token','Private bearer token for the BLACKHOLE Hermes background scheduler');
 end if;
 insert into public.office_cron_guard(name,token_sha256,updated_at)
 values('hermes',encode(extensions.digest(v_token,'sha256'),'hex'),now())
 on conflict(name) do update set token_sha256=excluded.token_sha256,updated_at=excluded.updated_at;
end;
$$;
