-- Agregação sem transferência de 2.732 processos ao navegador; relatório por equipe.
-- Usa RLS da carteira Lexis e empresa da sessão autenticada.
create or replace function public.infinitum_resumo_equipe()
returns table(
 auth_user_id uuid,
 nome text,
 cargo text,
 carteira_total bigint,
 carteira_ativos bigint,
 carteira_encerrados bigint
)
language sql stable security invoker
set search_path = ''
as $$
 select u.auth_user_id,u.nome,u.cargo,
  count(p.id) as carteira_total,
  count(p.id) filter(where coalesce(lower(p.status_interno),'ativo') not in ('encerrado','excluido')) as carteira_ativos,
  count(p.id) filter(where lower(coalesce(p.status_interno,''))='encerrado') as carteira_encerrados
 from public.usuarios u
 left join public.processos p
   on p.empresa_id=u.empresa_id
  and (p.created_by=u.id or p.created_by=u.auth_user_id)
 where u.empresa_id=(select public.get_user_empresa_id())
   and (select auth.uid()) is not null
 group by u.auth_user_id,u.nome,u.cargo
 order by u.nome;
$$;
revoke all on function public.infinitum_resumo_equipe() from PUBLIC;
grant execute on function public.infinitum_resumo_equipe() to authenticated;
