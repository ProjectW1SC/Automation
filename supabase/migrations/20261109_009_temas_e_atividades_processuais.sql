-- ProjectW1SC: processo vinculado a atividade e edição/exclusão lógica pelo próprio executor.
-- Nunca apagar ou reatribuir dados sem autorização. Dados antigos continuam válidos.
alter table public.crm_completed_activities
  add column if not exists process_number text,
  add column if not exists process_type text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table public.crm_completed_activities
  drop constraint if exists crm_completed_process_pair_check;
alter table public.crm_completed_activities
  add constraint crm_completed_process_pair_check
  check(
    (process_number is null and process_type is null)
    or (process_number ~ '^[0-9]{7}-[0-9]{2}\\.[0-9]{4}\\.[0-9]\\.[0-9]{2}\\.[0-9]{4}$'
        and process_type in ('comum','busca_apreensao'))
  );

create index if not exists crm_completed_visible_actor_idx
 on public.crm_completed_activities(actor_id,performed_on desc,created_at desc)
 where deleted_at is null;
create index if not exists crm_completed_process_number_idx
 on public.crm_completed_activities(process_number)
 where process_number is not null and deleted_at is null;

alter table public.crm_completed_activities enable row level security;
drop policy if exists crm_completed_update_own on public.crm_completed_activities;
create policy crm_completed_update_own
 on public.crm_completed_activities for update to authenticated
 using (
  actor_id=(select auth.uid())
  and deleted_at is null
  and (
   lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
   or exists(select 1 from public.crm_memberships m
      where m.user_id=(select auth.uid()) and m.enabled)
  )
 )
 with check (
  actor_id=(select auth.uid())
  and performed_on<=((now() at time zone 'America/Sao_Paulo')::date)
  and (
   lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
   or exists(select 1 from public.crm_memberships m
      where m.user_id=(select auth.uid()) and m.enabled)
  )
 );
revoke update, delete on public.crm_completed_activities from authenticated;
grant update (
 title,description,category,performed_on,client_id,contact_confirmed,duration_seconds,
 process_number,process_type,deleted_at,updated_at
) on public.crm_completed_activities to authenticated;

create or replace function public.crm_completed_mark_updated()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if new.actor_id is distinct from old.actor_id then
  raise exception 'Não é permitido alterar o responsável';
 end if;
 new.updated_at:=now();
 return new;
end $$;
drop trigger if exists crm_completed_mark_updated_trigger on public.crm_completed_activities;
create trigger crm_completed_mark_updated_trigger
before update on public.crm_completed_activities
for each row execute function public.crm_completed_mark_updated();
revoke all on function public.crm_completed_mark_updated() from public,anon,authenticated;
comment on column public.crm_completed_activities.process_number is 'CNJ do processo da atividade (opcional)';
comment on column public.crm_completed_activities.process_type is 'Tipo do processo: comum ou busca_apreensao';
comment on column public.crm_completed_activities.deleted_at is 'Exclusão lógica: histórico preservado e omitido da lista e do relatório';
