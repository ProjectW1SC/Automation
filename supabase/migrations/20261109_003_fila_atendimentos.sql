-- Operação de tarefas independente dos rótulos de origem: sem promessas de quitação.
alter table public.crm_clients
 add column if not exists priority_level text not null default 'normal'
 check (priority_level in ('normal','alta','urgente'));
alter table public.crm_clients
 add column if not exists workflow_status text not null default 'ativo'
 check (workflow_status in ('ativo','finalizado'));
alter table public.crm_clients add column if not exists due_override date;
alter table public.crm_clients add column if not exists assigned_to text;
alter table public.crm_clients add column if not exists finished_at timestamptz;
alter table public.crm_clients add column if not exists finish_reason text;
alter table public.crm_clients add column if not exists last_attendance_at timestamptz;
alter table public.crm_clients add column if not exists last_attended_by uuid references auth.users(id);
alter table public.crm_activities add column if not exists details jsonb not null default '{}'::jsonb;
create index if not exists crm_clients_workflow_due_idx on public.crm_clients(workflow_status,due_override,next_return);
create index if not exists crm_clients_priority_idx on public.crm_clients(priority_level);
create index if not exists crm_activities_kind_date_idx on public.crm_activities(kind,created_at desc);
-- Um caso explicitamente concluído anteriormente não deve reaparecer na fila.
update public.crm_clients set workflow_status='finalizado',
 finished_at=coalesce(finished_at,updated_at)
 where stage in ('concluido','arquivado') and workflow_status='ativo';

create or replace function public.crm_update_client(p_client_id uuid,p_patch jsonb,p_reason text default '')
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_current public.crm_clients%rowtype;
 v_saved public.crm_clients%rowtype;
 v_status text;
 v_priority text;
 v_reason text:=left(btrim(coalesce(p_reason,'')),2000);
 v_key text;
begin
 if auth.uid() is null
   or not (lower(coalesce(auth.jwt()->>'email',''))='intermedioesenegociacoes@gmail.com'
     or exists(select 1 from public.crm_memberships m where m.user_id=auth.uid() and m.enabled))
 then raise exception 'Sem autorização para editar o CRM.';end if;
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb
 then raise exception 'Informe o que deseja alterar.';end if;
 for v_key in select jsonb_object_keys(p_patch) loop
   if v_key not in ('name','phone','consultant','institution','contacted_party','assigned_to','priority_level','due_override','workflow_status','notes')
   then raise exception 'Campo de edição não permitido: %',v_key;end if;
 end loop;
 select * into v_current from public.crm_clients where id=p_client_id for update;
 if not found then raise exception 'Cliente não encontrado.';end if;
 v_status:=case when p_patch?'workflow_status'
   then p_patch->>'workflow_status' else v_current.workflow_status end;
 v_priority:=case when p_patch?'priority_level'
   then p_patch->>'priority_level' else v_current.priority_level end;
 if v_status not in ('ativo','finalizado') then raise exception 'Situação inválida.';end if;
 if v_priority not in ('normal','alta','urgente') then raise exception 'Prioridade inválida.';end if;
 if p_patch?'name' and length(btrim(coalesce(p_patch->>'name','')))<3
 then raise exception 'Nome do cliente deve ter pelo menos 3 caracteres.';end if;
 if p_patch?'due_override'
   and nullif(p_patch->>'due_override','') is not null
   and (p_patch->>'due_override') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$'
 then raise exception 'Data de retorno inválida.';end if;
 if v_status<>v_current.workflow_status and length(v_reason)<3
 then raise exception 'Descreva o motivo para finalizar ou reabrir o atendimento.';end if;
 update public.crm_clients set
  name=case when p_patch?'name' then btrim(p_patch->>'name') else name end,
  phone=case when p_patch?'phone' then nullif(btrim(p_patch->>'phone'),'') else phone end,
  consultant=case when p_patch?'consultant' then nullif(btrim(p_patch->>'consultant'),'') else consultant end,
  institution=case when p_patch?'institution' then nullif(btrim(p_patch->>'institution'),'') else institution end,
  contacted_party=case when p_patch?'contacted_party' then nullif(btrim(p_patch->>'contacted_party'),'') else contacted_party end,
  assigned_to=case when p_patch?'assigned_to' then nullif(btrim(p_patch->>'assigned_to'),'') else assigned_to end,
  priority_level=v_priority,
  due_override=case when p_patch?'due_override' then nullif(p_patch->>'due_override','')::date else due_override end,
  notes=case when p_patch?'notes' then nullif(btrim(p_patch->>'notes'),'') else notes end,
  workflow_status=v_status,
  stage=case when v_status='finalizado' then 'concluido'
      when v_current.workflow_status='finalizado' and v_status='ativo' and stage in ('concluido','arquivado')
      then 'a_analisar' else stage end,
  finished_at=case when v_status='finalizado' then coalesce(finished_at,now()) else null end,
  finish_reason=case when v_status='finalizado' and v_current.workflow_status<>'finalizado' then v_reason
                     when v_status='ativo' then null else finish_reason end,
  updated_at=now()
 where id=p_client_id returning * into v_saved;
 insert into public.crm_activities(client_id,kind,body,actor_id,details)
 values(p_client_id,
   case when v_status<>v_current.workflow_status then 'situacao' else 'edicao' end,
   case when v_status<>v_current.workflow_status
      then (case when v_status='finalizado' then 'Atendimento finalizado: ' else 'Atendimento reaberto: ' end)||v_reason
      else coalesce(nullif(v_reason,''),'Dados ou prioridade do cliente atualizados') end,
   auth.uid(),
   jsonb_build_object('alteracoes',p_patch,'situacao_anterior',v_current.workflow_status,'situacao_atual',v_status));
 return jsonb_build_object('id',v_saved.id,'workflow_status',v_saved.workflow_status,
  'priority_level',v_saved.priority_level,'due_date',coalesce(v_saved.due_override,v_saved.next_return));
end;
$$;

create or replace function public.crm_register_attendance(
 p_client_id uuid,p_body text,p_channel text,p_outcome text,p_next_due date default null,p_responsible text default null)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
 v_current public.crm_clients%rowtype;
 v_saved public.crm_clients%rowtype;
 v_body text:=btrim(coalesce(p_body,''));
 v_responsible text:=left(btrim(coalesce(p_responsible,'')),150);
 v_channel text:=lower(btrim(coalesce(p_channel,'')));
 v_outcome text:=lower(btrim(coalesce(p_outcome,'')));
begin
 if auth.uid() is null
   or not (lower(coalesce(auth.jwt()->>'email',''))='intermedioesenegociacoes@gmail.com'
      or exists(select 1 from public.crm_memberships m where m.user_id=auth.uid() and m.enabled))
 then raise exception 'Sem autorização para registrar atendimentos.';end if;
 if length(v_body)<5 or length(v_body)>4000
 then raise exception 'Descreva o atendimento ou tentativa com 5 a 4000 caracteres.';end if;
 if v_channel not in ('whatsapp','ligacao','email','presencial','outro')
 then raise exception 'Canal inválido.';end if;
 if v_outcome not in ('contatado','sem_resposta','em_negociacao','aguardando_resposta','outro')
 then raise exception 'Resultado inválido.';end if;
 select * into v_current from public.crm_clients where id=p_client_id for update;
 if not found then raise exception 'Cliente não encontrado.';end if;
 if v_current.workflow_status='finalizado'
 then raise exception 'Este cliente está finalizado. Reabra o caso antes de registrar atendimento.';end if;
 update public.crm_clients set
   last_contact=(now() at time zone 'America/Sao_Paulo')::date,
   last_attendance_at=now(),last_attended_by=auth.uid(),
   assigned_to=coalesce(nullif(v_responsible,''),assigned_to),
   due_override=coalesce(p_next_due,due_override),
   stage=case when v_outcome='contatado' then 'contatado'
              when v_outcome='em_negociacao' then 'em_negociacao'
              when v_outcome='aguardando_resposta' then 'aguardando_resposta'
              else stage end,
   updated_at=now()
 where id=p_client_id returning * into v_saved;
 insert into public.crm_activities(client_id,kind,body,actor_id,details)
 values(p_client_id,'atendimento',v_body,auth.uid(),
   jsonb_build_object('canal',v_channel,'resultado',v_outcome,
     'proximo_retorno_anterior',coalesce(v_current.due_override,v_current.next_return),
     'proximo_retorno',coalesce(v_saved.due_override,v_saved.next_return),
     'responsavel',coalesce(nullif(v_responsible,''),auth.jwt()->>'email'),
     'registrado_em',now()));
 return jsonb_build_object('id',v_saved.id,
   'last_contact',v_saved.last_contact,'next_return',coalesce(v_saved.due_override,v_saved.next_return),
   'stage',v_saved.stage);
end;
$$;
revoke all on function public.crm_update_client(uuid,jsonb,text) from public,anon;
revoke all on function public.crm_register_attendance(uuid,text,text,text,date,text) from public,anon;
grant execute on function public.crm_update_client(uuid,jsonb,text) to authenticated;
grant execute on function public.crm_register_attendance(uuid,text,text,text,date,text) to authenticated;
