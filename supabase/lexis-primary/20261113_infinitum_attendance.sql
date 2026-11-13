-- Aditivo para a base PRINCIPAL do LexisPredict (segjskjlbeydlljnefai).
-- Não altera tabelas existentes e não exclui registros.
-- A migração de dados legados do INFINITUM é feita separadamente.
-- Cada colaborador enxerga somente a empresa da própria sessão Lexis.
grant select, insert on public.tarefas_realizadas to authenticated;

do $$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tarefas_realizadas' and policyname='infinitum_empresa_attendance_read') then
  create policy infinitum_empresa_attendance_read on public.tarefas_realizadas
   for select to authenticated
   using (empresa_id=(select public.get_user_empresa_id()));
 end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='tarefas_realizadas' and policyname='infinitum_empresa_attendance_insert') then
  create policy infinitum_empresa_attendance_insert on public.tarefas_realizadas
   for insert to authenticated
   with check (empresa_id=(select public.get_user_empresa_id())
     and responsavel_auth_user_id=(select auth.uid()));
 end if;
end $$;

create or replace function public.infinitum_registrar_atendimento(
 p_processo_id bigint,
 p_descricao text,
 p_proximo_retorno date default null,
 p_contato_confirmado boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
 v_empresa uuid;
 v_usuario record;
 v_processo public.processos%rowtype;
 v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
 v_evento uuid;
begin
 v_empresa := public.get_user_empresa_id();
 if (select auth.uid()) is null or v_empresa is null then
  raise exception 'Sessão de empresa inválida' using errcode='42501';
 end if;
 select nome,auth_user_id into v_usuario
 from public.usuarios
 where auth_user_id=(select auth.uid()) and empresa_id=v_empresa
 limit 1;
 if v_usuario.auth_user_id is null or length(trim(coalesce(v_usuario.nome,'')))<2 then
  raise exception 'Usuário não pertence à organização ativa' using errcode='42501';
 end if;
 if length(trim(coalesce(p_descricao,'')))<3 or length(p_descricao)>3000 then
  raise exception 'Descrição do atendimento deve ter de 3 a 3000 caracteres';
 end if;
 if p_processo_id is null then
  raise exception 'Selecione um processo vinculado ao atendimento';
 end if;
 -- Respeita RLS já vigente no LexisPredict; nunca pula a política de atualização.
 update public.processos
 set ultimo_retorno=v_dia,
     proximo_retorno=coalesce(p_proximo_retorno,proximo_retorno),
     atendido_por=v_usuario.nome,
     updated_at=now()
 where id=p_processo_id and empresa_id=v_empresa
 returning * into v_processo;
 if not found then
  raise exception 'Processo não encontrado ou edição sem permissão' using errcode='42501';
 end if;
 insert into public.tarefas_realizadas(
  empresa_id,responsavel_auth_user_id,titulo,descricao,categoria,
  data_realizacao,protocolo_ref,processo_id,contato_cliente_confirmado,origem
 ) values (
  v_empresa,v_usuario.auth_user_id,'Atendimento registrado pelo Infinitum',
  trim(p_descricao),'atendimento',v_dia,
  v_processo.protocolo_ref,p_processo_id,coalesce(p_contato_confirmado,false),'infinitum'
 ) returning id into v_evento;
 return jsonb_build_object('ok',true,'evento_id',v_evento,'processo_id',p_processo_id,
   'ultimo_atendimento',v_dia,'proximo_atendimento',v_processo.proximo_retorno,
   'responsavel',v_usuario.nome,'responsavel_id',v_usuario.auth_user_id);
end;
$$;

revoke all on function public.infinitum_registrar_atendimento(bigint,text,date,boolean) from public;
grant execute on function public.infinitum_registrar_atendimento(bigint,text,date,boolean) to authenticated;
