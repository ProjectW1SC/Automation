-- Registro atômico de atendimento nos clientes históricos do Infinitum.
-- Não altera as 61 tabelas originais do LexisPredict.
create or replace function public.infinitum_registrar_atendimento_cliente(
 p_cliente_id uuid,
 p_descricao text,
 p_proximo_retorno date default null,
 p_contato_confirmado boolean default false
)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare v_empresa uuid; v_nome text; v_id uuid; v_cliente public.crm_clients%rowtype; v_evento uuid;
begin
 v_empresa:=public.get_user_empresa_id();v_id:=(select auth.uid());
 if v_id is null or v_empresa is null then raise exception 'Usuário sem empresa' using errcode='42501';end if;
 select nome into v_nome from public.usuarios where empresa_id=v_empresa and auth_user_id=v_id limit 1;
 if nullif(trim(coalesce(v_nome,'')),'') is null then raise exception 'Usuário não autorizado' using errcode='42501';end if;
 if char_length(trim(coalesce(p_descricao,'')))<3 or char_length(p_descricao)>3000
 then raise exception 'Resumo do atendimento inválido';end if;
 update public.crm_clients set last_attendance_at=now(),
  last_attended_by=v_id,
  next_return=coalesce(p_proximo_retorno,next_return),
  updated_at=now()
 where id=p_cliente_id and empresa_id=v_empresa returning * into v_cliente;
 if not found then raise exception 'Cliente não encontrado nesta organização' using errcode='42501';end if;
 insert into public.crm_activities(client_id,kind,body,actor_id,details)
 values(p_cliente_id,'atendimento',trim(p_descricao),v_id,
  jsonb_build_object('contato_confirmado',coalesce(p_contato_confirmado,false),'origem','infinitum_lexis_compartilhado'))
 returning id into v_evento;
 return jsonb_build_object('ok',true,'cliente_id',p_cliente_id,'evento_id',v_evento,
  'ultimo_atendimento',v_cliente.last_attendance_at,'proximo_atendimento',v_cliente.next_return,
  'responsavel',v_nome,'responsavel_id',v_id);
end;
$$;
revoke all on function public.infinitum_registrar_atendimento_cliente(uuid,text,date,boolean) from PUBLIC;
grant execute on function public.infinitum_registrar_atendimento_cliente(uuid,text,date,boolean) to authenticated;
