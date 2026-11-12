-- Scheduled, read-only mini-agent triage; never sends messages, alters deadlines or invents events.
create schema if not exists private;
create table if not exists private.office_mini_daily_guard(
 owner_id uuid not null references auth.users(id) on delete cascade,
 run_day date not null,created_at timestamptz not null default now(),
 primary key(owner_id,run_day)
);
revoke all on private.office_mini_daily_guard from public,anon,authenticated;
create or replace function private.office_auto_triage_tick()
returns integer language plpgsql security definer set search_path=''
as $$
declare v_owner uuid;v_today date;v_count integer:=0;
 v_overdue integer;v_today_count integer;v_week integer;v_unverified integer;v_returns integer;v_case_reviews integer;v_actions jsonb;
begin
 v_today:=(now() at time zone 'America/Sao_Paulo')::date;
 for v_owner in
  select distinct owner_id from (
   select owner_id from public.office_clients where status='ativo'
   union all select owner_id from public.office_cases where status='ativo'
   union all select owner_id from public.office_deadlines where status='aberto'
  ) owners where owner_id is not null
 loop
  insert into private.office_mini_daily_guard(owner_id,run_day) values(v_owner,v_today) on conflict do nothing;
  if not found then continue;end if;
  select count(*) filter(where due_on<v_today),count(*) filter(where due_on=v_today),
    count(*) filter(where due_on>v_today and due_on<=v_today+7),
    count(*) filter(where not verified and kind in ('prazo','audiencia'))
    into v_overdue,v_today_count,v_week,v_unverified
    from public.office_deadlines where owner_id=v_owner and status='aberto';
  select count(*) into v_returns from public.office_clients where owner_id=v_owner and status='ativo' and next_return<=v_today;
  select count(*) into v_case_reviews from public.office_cases where owner_id=v_owner and status='ativo' and next_review<=v_today;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'title',left(title,150),'date',due_on,'priority',priority)),'[]'::jsonb)
   into v_actions from (
    select id,kind,title,due_on,priority from public.office_deadlines
    where owner_id=v_owner and status='aberto' and due_on<=v_today+7
    order by due_on,case priority when 'urgente' then 1 when 'alta' then 2 else 3 end limit 12
   ) urgent;
  insert into public.office_agent_runs(owner_id,agent,task,mode,status,result,sources,external_actions)
  values(v_owner,'mini','Triagem automática diária','scheduled','review',
   jsonb_build_object('asOf',v_today,'counts',jsonb_build_object('overdue',v_overdue,'today',v_today_count,'week',v_week,
    'unverified',v_unverified,'returnDue',v_returns,'reviewDue',v_case_reviews),
    'actions',v_actions,'notes',jsonb_build_array('Datas cadastradas exigem conferência judicial.','Sem envio de WhatsApp, protocolo ou ato externo.')),
   jsonb_build_array(jsonb_build_object('type','crm','date',v_today,'verifiedJudicial',false)),0);
  v_count:=v_count+1;
 end loop;
 return v_count;
end;$$;
revoke all on function private.office_auto_triage_tick() from public,anon,authenticated;
grant execute on function private.office_auto_triage_tick() to postgres;
select cron.schedule('projectw1sc-mini-agent-daily','10 * * * *',$$select private.office_auto_triage_tick();$$);
