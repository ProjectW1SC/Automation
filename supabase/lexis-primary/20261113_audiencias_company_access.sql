-- Permitir que toda a organização consulte suas próprias audiências.
-- A tabela já existe no LexisPredict e tem RLS; não recria nem altera registros.
ALTER TABLE public.audiencias_monitoradas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audiencias_monitoradas FROM anon;
GRANT SELECT ON TABLE public.audiencias_monitoradas TO authenticated;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename='audiencias_monitoradas' AND policyname='infinitum_audiencias_empresa_select') THEN
  CREATE POLICY infinitum_audiencias_empresa_select
   ON public.audiencias_monitoradas FOR SELECT TO authenticated
   USING (
     (SELECT auth.uid()) IS NOT NULL
     AND empresa_id=(SELECT public.get_user_empresa_id())
   );
 END IF;
END $$;
