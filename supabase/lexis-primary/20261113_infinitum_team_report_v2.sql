-- Soma auditável de atividades históricas sem carregar toda a carteira para o navegador.
create index if not exists infinitum_tarefas_empresa_usuario_idx on public.tarefas_realizadas(empresa_id,responsavel_auth_user_id,data_realizacao);

create or replace function public.infinitum_resumo_equipe_v2()
returns table(
 auth_user_id uuid,nome text,cargo text,
 carteira_total bigint,carteira_ativos bigint,carteira_encerrados bigint,
 historico_atividades bigint,historico_atendimentos bigint
)
language sql stable security invoker set search_path = ''
as $$
 with company as (select public.get_user_empresa_id() as id),
 carteira as (
  select p.created_by,
   count(*) as total,
   count(*) filter(where coalesce(lower(p.status_interno),'ativo') not in ('encerrado','excluido')) as ativos,
   count(*) filter(where lower(coalesce(p.status_interno,''))='encerrado') as encerrados
  from public.processos p
  where p.empresa_id=(select id from company)
  group by p.created_by
 ),
 atividades as (
  select t.responsavel_auth_user_id,
   count(*) as total,
   count(*) filter(where t.categoria='atendimento') as atendimentos
  from public.tarefas_realizadas t
  where t.empresa_id=(select id from company)
  group by t.responsavel_auth_user_id
 )
 select u.auth_user_id,u.nome,u.cargo,
  coalesce(cp1.total,0)+case when u.id=u.auth_user_id then 0 else coalesce(cp2.total,0) end,
  coalesce(cp1.ativos,0)+case when u.id=u.auth_user_id then 0 else coalesce(cp2.ativos,0) end,
  coalesce(cp1.encerrados,0)+case when u.id=u.auth_user_id then 0 else coalesce(cp2.encerrados,0) end,
  coalesce(a.total,0),coalesce(a.atendimentos,0)
 from public.usuarios u
 left join carteira cp1 on cp1.created_by=u.id
 left join carteira cp2 on cp2.created_by=u.auth_user_id
 left join atividades a on a.responsavel_auth_user_id=u.auth_user_id
 where u.empresa_id=(select id from company) and (select auth.uid()) is not null
 order by u.nome
$$;
revoke all on function public.infinitum_resumo_equipe_v2() from PUBLIC;
grant execute on function public.infinitum_resumo_equipe_v2() to authenticated;
