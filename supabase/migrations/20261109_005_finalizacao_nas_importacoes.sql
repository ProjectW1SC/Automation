-- Keep reconciliation effective on future imports without undoing a user's reabertura.
-- Only trusted CRM source rows already protected by RLS may cause this transition.
create or replace function public.crm_track_manual_workflow()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if auth.uid() is not null
   and new.workflow_status is distinct from old.workflow_status
   and not (new.closure_source is distinct from old.closure_source
            and new.closure_source like 'planilha:%') then
   new.workflow_override:=new.workflow_status;
 end if;
 return new;
end $$;

create or replace function public.crm_finish_from_source_row()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare
 v_client uuid;
 v_is_final boolean:=false;
 v_origin text;
begin
 if new.client_id is null then return new; end if;
 v_is_final:=(
   (new.source_spreadsheet='1mJN5BUHJtFAoqxVWzLgyEX0CF8XsdVd5H2waYJVDKIg'
      and new.source_tab='FINALIZADOS')
   or
   (new.source_spreadsheet='1mJN5BUHJtFAoqxVWzLgyEX0CF8XsdVd5H2waYJVDKIg'
      and new.source_tab='QUITADOS'
      and new.snapshot->>'source_status'='quitado_na_planilha')
   or
   (new.source_spreadsheet in
      ('Excel - importação autorizada','1buWOKGoeJPPLyzry5GdQLH4-iRwFr067Ix1pDdqkdUQ')
      and new.source_tab='Quitados'
      and new.snapshot->>'source_status'='quitado_na_planilha')
 );
 if not v_is_final then return new; end if;
 v_origin:='planilha:'||new.source_spreadsheet||'/'||new.source_tab;
 update public.crm_clients
 set workflow_status='finalizado',stage='concluido',
     finished_at=coalesce(finished_at,now()),
     finish_reason='Conciliação de planilhas: encerramento informado na origem. Comprovação financeira independente.',
     closure_source=v_origin,
     source_conflict=source_conflict or
       (source_status='vencido' and new.source_tab in ('QUITADOS','Quitados')),
     updated_at=now()
 where id=new.client_id and workflow_status='ativo' and workflow_override is null
 returning id into v_client;
 if v_client is not null then
   insert into public.crm_activities(client_id,kind,body,details)
   values(v_client,'conciliacao',
     'Finalizado automaticamente após registro de origem na planilha, preservando histórico e evidência.',
     jsonb_build_object('origem',new.source_tab,'tipo','conciliacao_de_fonte'));
 end if;
 return new;
end $$;
drop trigger if exists crm_finish_from_source_row_trigger on public.crm_source_rows;
create trigger crm_finish_from_source_row_trigger
after insert or update of client_id,snapshot on public.crm_source_rows
for each row execute function public.crm_finish_from_source_row();
revoke all on function public.crm_finish_from_source_row() from public,anon,authenticated;
