-- INFINITUM: leitura de análises do próprio colaborador, dentro da empresa Lexis.
-- Não há acesso anônimo, não modifica registros existentes e preserva as policies do Lexis.
ALTER TABLE public.registros_trabalho_analitico ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.registros_trabalho_analitico TO authenticated;
DO $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registros_trabalho_analitico'
   AND policyname='infinitum_lexis_analises_own_read'
 ) THEN
  CREATE POLICY infinitum_lexis_analises_own_read ON public.registros_trabalho_analitico
   FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) IS NOT NULL
    AND empresa_id=(SELECT public.get_user_empresa_id())
    AND responsavel_auth_user_id=(SELECT auth.uid())
   );
 END IF;
END $$;
-- Permite editar apenas atividade de registro manual do próprio usuário.
-- Histórico analítico automatizado, decisões e auditoria oficial permanecem imutáveis.
ALTER TABLE public.tarefas_realizadas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tarefas_realizadas'
   AND policyname='infinitum_lexis_manual_activity_update'
 ) THEN
  CREATE POLICY infinitum_lexis_manual_activity_update ON public.tarefas_realizadas
  FOR UPDATE TO authenticated
  USING (
   (SELECT auth.uid()) IS NOT NULL
   AND empresa_id=(SELECT public.get_user_empresa_id())
   AND responsavel_auth_user_id=(SELECT auth.uid())
   AND origem='infinitum_manual'
  )
  WITH CHECK (
   (SELECT auth.uid()) IS NOT NULL
   AND empresa_id=(SELECT public.get_user_empresa_id())
   AND responsavel_auth_user_id=(SELECT auth.uid())
   AND origem='infinitum_manual'
  );
 END IF;
END $$;
