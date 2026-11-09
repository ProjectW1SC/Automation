-- ProjectW1SC: reconcile explicit finished-sheet entries and keep manual reopening authoritative.
-- No client data/CPF in source control. Source rows are imported only to protected Supabase tables.
alter table public.crm_clients
 add column if not exists workflow_override text
 check(workflow_override in ('ativo','finalizado'));
alter table public.crm_clients
 add column if not exists closure_source text;
create index if not exists crm_clients_workflow_override_idx
 on public.crm_clients(workflow_status,workflow_override);
create or replace function public.crm_track_manual_workflow()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 -- A direct authenticated user action takes precedence over future Google Sheet imports.
 -- Administrative reconciliation (auth.uid() IS NULL) must not create a manual override.
 if auth.uid() is not null and
    new.workflow_status is distinct from old.workflow_status then
   new.workflow_override := new.workflow_status;
 end if;
 return new;
end $$;
drop trigger if exists crm_track_manual_workflow_trigger on public.crm_clients;
create trigger crm_track_manual_workflow_trigger
before update of workflow_status on public.crm_clients
for each row execute function public.crm_track_manual_workflow();
revoke all on function public.crm_track_manual_workflow() from public,anon,authenticated;
comment on column public.crm_clients.workflow_override is
 'Manual decision with precedence: ativo after Reabrir prevents an old sheet from closing the client again.';
comment on column public.crm_clients.closure_source is
 'Traceable origin of automatic closure; does NOT imply documentary payment verification.';
