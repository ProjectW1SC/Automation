-- Preserve current client priority field, let attendants update it atomically,
-- and keep standalone annotations in the existing auditable CRM history.
create or replace function public.crm_add_client_note(p_client_id uuid,p_body text)
returns jsonb
language plpgsql security invoker
set search_path=public,pg_temp
as $$
declare
 v_text text:=btrim(coalesce(p_body,''));
 v_id uuid;
begin
 if (select auth.uid()) is null or not (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists (select 1 from public.crm_memberships m
    where m.user_id=(select auth.uid()) and m.enabled)
 ) then raise exception 'Conta sem permissão para registrar anotações.';end if;
 if char_length(v_text)<3 or char_length(v_text)>4000
 then raise exception 'Anotação deve ter de 3 a 4000 caracteres.';end if;
 if not exists (select 1 from public.crm_clients where id=p_client_id)
 then raise exception 'Cliente não encontrado.';end if;
 insert into public.crm_activities(client_id,kind,body,actor_id,details)
 values(p_client_id,'anotacao',v_text,(select auth.uid()),
  jsonb_build_object('origem','anotacao_manual','registrado_em',now()))
 returning id into v_id;
 return jsonb_build_object('id',v_id,'kind','anotacao');
end $$;
revoke all on function public.crm_add_client_note(uuid,text) from public,anon;
grant execute on function public.crm_add_client_note(uuid,text) to authenticated;

create or replace function public.crm_register_attendance_with_criticidade(
 p_client_id uuid,
 p_body text,
 p_channel text,
 p_outcome text,
 p_next_due date default null,
 p_responsible text default null,
 p_priority_level text default 'normal',
 p_note text default null
)
returns jsonb
language plpgsql security invoker
set search_path=public,pg_temp
as $$
declare
 v_priority text:=lower(btrim(coalesce(p_priority_level,'')));
 v_previous text;
 v_note text:=btrim(coalesce(p_note,''));
 v_result jsonb;
begin
 if v_priority not in ('normal','alta','urgente')
 then raise exception 'Nível de criticidade inválido.';end if;
 if length(v_note)>4000 or (length(v_note)>0 and length(v_note)<3)
 then raise exception 'A anotação deve ter de 3 a 4000 caracteres.';end if;
 -- Avoid partially saving attendance when another operation fails:
 -- Postgres rolls back the entire RPC transaction on any exception.
 select priority_level into v_previous from public.crm_clients
 where id=p_client_id for update;
 if not found then raise exception 'Cliente não encontrado.';end if;
 v_result:=public.crm_register_attendance(
  p_client_id,p_body,p_channel,p_outcome,p_next_due,p_responsible
 );
 if v_priority is distinct from v_previous then
  perform public.crm_update_client(
   p_client_id,jsonb_build_object('priority_level',v_priority),
   'Criticidade alterada durante o atendimento'
  );
 end if;
 if v_note<>'' then
  perform public.crm_add_client_note(p_client_id,v_note);
 end if;
 return v_result||jsonb_build_object('priority_level',v_priority,'annotation_added',v_note<>'');
end $$;
revoke all on function public.crm_register_attendance_with_criticidade(uuid,text,text,text,date,text,text,text) from public,anon;
grant execute on function public.crm_register_attendance_with_criticidade(uuid,text,text,text,date,text,text,text) to authenticated;
