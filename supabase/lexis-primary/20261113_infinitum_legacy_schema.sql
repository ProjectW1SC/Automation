-- Schema isolado do Infinitum copiado para o Supabase principal LexisPredict.\n-- Não altera tabelas preexistentes, não liga CRON e não contém registros de clientes.\n-- A coluna empresa_id adicionada limita a visão de cada empresa pelo Supabase Auth do Lexis.\n\nCREATE TABLE IF NOT EXISTS public."crm_activities" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "client_id" uuid NOT NULL,\n  "kind" text DEFAULT 'anotacao'::text NOT NULL,\n  "body" text NOT NULL,\n  "actor_id" uuid,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_activities_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_activities" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_activities" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_activities" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_activities_empresa_idx" ON public."crm_activities" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_activities" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_activities" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_activities" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_clients" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "source_key" text NOT NULL,\n  "name" text NOT NULL,\n  "doc_digits" text,\n  "phone" text,\n  "consultant" text,\n  "institution" text,\n  "contacted_party" text,\n  "source_status" text DEFAULT 'em_andamento'::text NOT NULL,\n  "source_tab" text,\n  "source_spreadsheet" text,\n  "source_conflict" boolean DEFAULT false NOT NULL,\n  "source_tabs" text[] DEFAULT '{}'::text[] NOT NULL,\n  "source_row_count" integer DEFAULT 1 NOT NULL,\n  "stage" text DEFAULT 'a_analisar'::text NOT NULL,\n  "sale_amount" numeric(14,2),\n  "sale_date" date,\n  "last_contact" date,\n  "next_return" date,\n  "debtor_balance" numeric(14,2),\n  "estimated_amount" numeric(14,2),\n  "current_amount" numeric(14,2),\n  "last_negotiation" date,\n  "notes" text,\n  "evidence_status" text DEFAULT 'sem_validacao'::text NOT NULL,\n  "evidence_url" text,\n  "verified_at" timestamp with time zone,\n  "verified_by" uuid,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "source_seen_at" timestamp with time zone,\n  "priority_level" text DEFAULT 'normal'::text NOT NULL,\n  "workflow_status" text DEFAULT 'ativo'::text NOT NULL,\n  "due_override" date,\n  "assigned_to" text,\n  "finished_at" timestamp with time zone,\n  "finish_reason" text,\n  "last_attendance_at" timestamp with time zone,\n  "last_attended_by" uuid,\n  "workflow_override" text,\n  "closure_source" text,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_clients_pkey" PRIMARY KEY (id),\n  CONSTRAINT "crm_clients_source_key_key" UNIQUE (source_key)\n);\nALTER TABLE public."crm_clients" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_clients" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_clients" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_clients_empresa_idx" ON public."crm_clients" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_clients" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_clients" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_clients" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_completed_activities" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "actor_id" uuid DEFAULT auth.uid() NOT NULL,\n  "client_id" uuid,\n  "title" text NOT NULL,\n  "description" text DEFAULT ''::text NOT NULL,\n  "category" text NOT NULL,\n  "performed_on" date NOT NULL,\n  "contact_confirmed" boolean DEFAULT false NOT NULL,\n  "duration_seconds" integer DEFAULT 0 NOT NULL,\n  "origin" text DEFAULT 'registro_manual_autodeclarado'::text NOT NULL,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "process_number" text,\n  "process_type" text,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "deleted_at" timestamp with time zone,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_completed_activities_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_completed_activities" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_completed_activities" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_completed_activities" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_completed_activities_empresa_idx" ON public."crm_completed_activities" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_completed_activities" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_completed_activities" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_completed_activities" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_import_runs" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "started_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "finished_at" timestamp with time zone,\n  "source_file" text NOT NULL,\n  "status" text DEFAULT 'executando'::text NOT NULL,\n  "rows_read" integer DEFAULT 0 NOT NULL,\n  "clients_merged" integer DEFAULT 0 NOT NULL,\n  "error" text,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_import_runs_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_import_runs" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_import_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_import_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_import_runs_empresa_idx" ON public."crm_import_runs" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_import_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_import_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_import_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_judicial_snapshots" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "actor_id" uuid DEFAULT auth.uid() NOT NULL,\n  "process_number" text NOT NULL,\n  "source" text NOT NULL,\n  "query_key" text DEFAULT 'latest'::text NOT NULL,\n  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "found" boolean DEFAULT false NOT NULL,\n  "payload" jsonb NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_judicial_snapshots_actor_id_process_number_source_query_key" UNIQUE (actor_id, process_number, source, query_key),\n  CONSTRAINT "crm_judicial_snapshots_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_judicial_snapshots" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_judicial_snapshots" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_judicial_snapshots" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_judicial_snapshots_empresa_idx" ON public."crm_judicial_snapshots" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_judicial_snapshots" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_judicial_snapshots" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_judicial_snapshots" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_leads" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "source_key" text NOT NULL,\n  "source" text NOT NULL,\n  "name" text NOT NULL,\n  "company" text,\n  "phone" text,\n  "email" text,\n  "source_url" text,\n  "source_detail" text,\n  "interest" text,\n  "stage" text DEFAULT 'novo'::text NOT NULL,\n  "score" integer DEFAULT 0 NOT NULL,\n  "consent_at" date,\n  "consent_source" text,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_leads_pkey" PRIMARY KEY (id),\n  CONSTRAINT "crm_leads_source_key_key" UNIQUE (source_key)\n);\nALTER TABLE public."crm_leads" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_leads" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_leads" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_leads_empresa_idx" ON public."crm_leads" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_leads" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_leads" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_leads" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_memberships" (\n  "user_id" uuid NOT NULL,\n  "role" text DEFAULT 'operator'::text NOT NULL,\n  "enabled" boolean DEFAULT true NOT NULL,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_memberships_pkey" PRIMARY KEY (user_id)\n);\nALTER TABLE public."crm_memberships" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_memberships" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_memberships" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_memberships_empresa_idx" ON public."crm_memberships" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_memberships" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_memberships" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_memberships" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_parties" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "name" text NOT NULL,\n  "kind" text NOT NULL,\n  "contact" text,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "logo_path" text,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_parties_name_kind_key" UNIQUE (name, kind),\n  CONSTRAINT "crm_parties_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_parties" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_parties" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_parties" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_parties_empresa_idx" ON public."crm_parties" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_parties" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_parties" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_parties" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_process_candidates" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "source" text DEFAULT 'DJEN'::text NOT NULL,\n  "process_number" text NOT NULL,\n  "query_term" text NOT NULL,\n  "official_date" date,\n  "tribunal" text,\n  "headline" text,\n  "evidence" text,\n  "source_url" text,\n  "external_ref" text,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "person_name" text,\n  "person_name_source" text,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_process_candidates_owner_id_process_number_query_term_key" UNIQUE (owner_id, process_number, query_term),\n  CONSTRAINT "crm_process_candidates_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_process_candidates" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_process_candidates" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_process_candidates" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_process_candidates_empresa_idx" ON public."crm_process_candidates" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_process_candidates" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_process_candidates" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_process_candidates" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_processes" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "actor_id" uuid DEFAULT auth.uid() NOT NULL,\n  "process_number" text NOT NULL,\n  "process_type" text NOT NULL,\n  "client_id" uuid,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_processes_actor_id_process_number_key" UNIQUE (actor_id, process_number),\n  CONSTRAINT "crm_processes_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."crm_processes" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_processes" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_processes" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_processes_empresa_idx" ON public."crm_processes" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_processes" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_processes" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_processes" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_source_rows" (\n  "source_ref" text NOT NULL,\n  "client_id" uuid,\n  "source_spreadsheet" text NOT NULL,\n  "source_tab" text NOT NULL,\n  "source_row" integer NOT NULL,\n  "snapshot" jsonb NOT NULL,\n  "seen_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_source_rows_pkey" PRIMARY KEY (source_ref)\n);\nALTER TABLE public."crm_source_rows" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_source_rows" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_source_rows" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_source_rows_empresa_idx" ON public."crm_source_rows" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_source_rows" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_source_rows" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_source_rows" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."crm_unmatched_sources" (\n  "source_ref" text NOT NULL,\n  "source_file" text NOT NULL,\n  "source_tab" text NOT NULL,\n  "source_row" integer NOT NULL,\n  "client_name" text,\n  "possible_client_id" uuid,\n  "reason" text NOT NULL,\n  "snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "crm_unmatched_sources_pkey" PRIMARY KEY (source_ref)\n);\nALTER TABLE public."crm_unmatched_sources" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."crm_unmatched_sources" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_unmatched_sources" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_unmatched_sources_empresa_idx" ON public."crm_unmatched_sources" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_unmatched_sources" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_unmatched_sources" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_unmatched_sources" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_agent_runs" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "agent" text NOT NULL,\n  "task" text NOT NULL,\n  "mode" text DEFAULT 'manual'::text NOT NULL,\n  "status" text DEFAULT 'review'::text NOT NULL,\n  "result" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "sources" jsonb DEFAULT '[]'::jsonb NOT NULL,\n  "external_actions" integer DEFAULT 0 NOT NULL,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_agent_runs_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_agent_runs" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_agent_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_agent_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_agent_runs_empresa_idx" ON public."office_agent_runs" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_agent_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_agent_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_agent_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_cases" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "client_id" uuid,\n  "process_number" text,\n  "title" text NOT NULL,\n  "subject" text,\n  "tribunal" text,\n  "lawyer" text,\n  "status" text DEFAULT 'ativo'::text NOT NULL,\n  "next_review" date,\n  "notes" text,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_cases_pkey" PRIMARY KEY (id),\n  CONSTRAINT "office_cases_process_number_key" UNIQUE (process_number)\n);\nALTER TABLE public."office_cases" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_cases" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_cases" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_cases_empresa_idx" ON public."office_cases" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_cases" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_cases" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_cases" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_clients" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "name" text NOT NULL,\n  "phone" text,\n  "email" text,\n  "document" text,\n  "notes" text,\n  "status" text DEFAULT 'ativo'::text NOT NULL,\n  "next_return" date,\n  "responsible" text,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_clients_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_clients" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_clients" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_clients" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_clients_empresa_idx" ON public."office_clients" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_clients" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_clients" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_clients" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_cron_guard" (\n  "name" text NOT NULL,\n  "token_sha256" text NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_cron_guard_pkey" PRIMARY KEY (name)\n);\nALTER TABLE public."office_cron_guard" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_cron_guard" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_cron_guard" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_cron_guard_empresa_idx" ON public."office_cron_guard" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_cron_guard" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_cron_guard" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_cron_guard" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_deadlines" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "client_id" uuid,\n  "case_id" uuid,\n  "title" text NOT NULL,\n  "due_on" date NOT NULL,\n  "status" text DEFAULT 'aberto'::text NOT NULL,\n  "priority" text DEFAULT 'normal'::text NOT NULL,\n  "kind" text DEFAULT 'prazo'::text NOT NULL,\n  "source" text,\n  "source_url" text,\n  "verified" boolean DEFAULT false NOT NULL,\n  "notes" text,\n  "responsible" text,\n  "completed_at" timestamp with time zone,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_deadlines_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_deadlines" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_deadlines" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_deadlines" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_deadlines_empresa_idx" ON public."office_deadlines" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_deadlines" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_deadlines" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_deadlines" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_documents" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "case_id" uuid,\n  "client_id" uuid,\n  "title" text NOT NULL,\n  "kind" text DEFAULT 'manifestacao'::text NOT NULL,\n  "body" text DEFAULT ''::text NOT NULL,\n  "evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "status" text DEFAULT 'rascunho'::text NOT NULL,\n  "model_used" text,\n  "external_ai_consent" boolean DEFAULT false NOT NULL,\n  "reviewed_by" uuid,\n  "reviewed_at" timestamp with time zone,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_documents_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_documents" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_documents" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_documents" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_documents_empresa_idx" ON public."office_documents" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_documents" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_documents" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_documents" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_intake" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "name" text NOT NULL,\n  "email" text,\n  "phone" text,\n  "practice_area" text NOT NULL,\n  "message" text,\n  "consent_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "consent_source" text DEFAULT 'formulario_publico'::text NOT NULL,\n  "converted_at" timestamp with time zone,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_intake_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_intake" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_intake" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_intake" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_intake_empresa_idx" ON public."office_intake" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_intake" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_intake" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_intake" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_official_backoff" (\n  "actor_id" uuid NOT NULL,\n  "process_number" text NOT NULL,\n  "source" text NOT NULL,\n  "status" integer NOT NULL,\n  "failed_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "retry_after" timestamp with time zone NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_official_backoff_pkey" PRIMARY KEY (actor_id, process_number, source)\n);\nALTER TABLE public."office_official_backoff" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_official_backoff" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_official_backoff" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_official_backoff_empresa_idx" ON public."office_official_backoff" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_official_backoff" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_official_backoff" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_official_backoff" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_scan_runs" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "actor_id" uuid DEFAULT auth.uid() NOT NULL,\n  "process_number" text NOT NULL,\n  "trigger_mode" text DEFAULT 'manual'::text NOT NULL,\n  "source_status" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "review" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_scan_runs_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_scan_runs" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_scan_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_scan_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_scan_runs_empresa_idx" ON public."office_scan_runs" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_scan_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_scan_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_scan_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_source_cooldowns" (\n  "source" text NOT NULL,\n  "status" integer NOT NULL,\n  "failed_at" timestamp with time zone NOT NULL,\n  "retry_after" timestamp with time zone NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_source_cooldowns_pkey" PRIMARY KEY (source)\n);\nALTER TABLE public."office_source_cooldowns" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_source_cooldowns" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_source_cooldowns" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_source_cooldowns_empresa_idx" ON public."office_source_cooldowns" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_source_cooldowns" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_source_cooldowns" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_source_cooldowns" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_wa_chat_archive" (\n  "owner_id" uuid NOT NULL,\n  "jid" text NOT NULL,\n  "name" text DEFAULT ''::text NOT NULL,\n  "phone" text DEFAULT ''::text NOT NULL,\n  "is_group" boolean DEFAULT false NOT NULL,\n  "last_message" text DEFAULT ''::text NOT NULL,\n  "last_message_at" timestamp with time zone,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_wa_chat_archive_pkey" PRIMARY KEY (owner_id, jid)\n);\nALTER TABLE public."office_wa_chat_archive" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_wa_chat_archive" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_wa_chat_archive" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_wa_chat_archive_empresa_idx" ON public."office_wa_chat_archive" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_wa_chat_archive" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_wa_chat_archive" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_wa_chat_archive" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_wa_message_archive" (\n  "owner_id" uuid NOT NULL,\n  "jid" text NOT NULL,\n  "provider_message_id" text NOT NULL,\n  "content" text DEFAULT ''::text NOT NULL,\n  "is_from_me" boolean DEFAULT false NOT NULL,\n  "media_type" text,\n  "ack" smallint DEFAULT 0 NOT NULL,\n  "timestamp" timestamp with time zone NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_wa_message_archive_pkey" PRIMARY KEY (owner_id, jid, provider_message_id)\n);\nALTER TABLE public."office_wa_message_archive" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_wa_message_archive" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_wa_message_archive" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_wa_message_archive_empresa_idx" ON public."office_wa_message_archive" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_wa_message_archive" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_wa_message_archive" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_wa_message_archive" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_whatsapp_messages" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid,\n  "client_id" uuid,\n  "provider_message_id" text,\n  "phone" text NOT NULL,\n  "display_name" text,\n  "direction" text NOT NULL,\n  "body" text DEFAULT ''::text NOT NULL,\n  "received_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "status" text DEFAULT 'received'::text NOT NULL,\n  "provider_status" text,\n  "reviewed_by" uuid,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_whatsapp_messages_pkey" PRIMARY KEY (id),\n  CONSTRAINT "office_whatsapp_messages_provider_message_id_key" UNIQUE (provider_message_id)\n);\nALTER TABLE public."office_whatsapp_messages" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_whatsapp_messages" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_whatsapp_messages" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_whatsapp_messages_empresa_idx" ON public."office_whatsapp_messages" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_whatsapp_messages" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_whatsapp_messages" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_whatsapp_messages" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."office_workflow_cards" (\n  "id" uuid DEFAULT gen_random_uuid() NOT NULL,\n  "owner_id" uuid DEFAULT auth.uid() NOT NULL,\n  "case_id" uuid,\n  "title" text NOT NULL,\n  "description" text DEFAULT ''::text NOT NULL,\n  "stage" text DEFAULT 'entrada'::text NOT NULL,\n  "card_type" text DEFAULT 'tarefa'::text NOT NULL,\n  "priority" text DEFAULT 'normal'::text NOT NULL,\n  "due_on" date,\n  "assigned_to" text,\n  "source" text DEFAULT 'manual'::text NOT NULL,\n  "external_ref" text,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "office_workflow_cards_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."office_workflow_cards" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."office_workflow_cards" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_workflow_cards" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_workflow_cards_empresa_idx" ON public."office_workflow_cards" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_workflow_cards" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_workflow_cards" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_workflow_cards" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."wa_auto_config" (\n  "id" text NOT NULL,\n  "secret_hash" text NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "wa_auto_config_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."wa_auto_config" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."wa_auto_config" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_config" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_config_empresa_idx" ON public."wa_auto_config" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_config" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_config" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_config" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."wa_auto_intents" (\n  "id" text NOT NULL,\n  "kind" text NOT NULL,\n  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,\n  "created_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "wa_auto_intents_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."wa_auto_intents" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."wa_auto_intents" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_intents" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_intents_empresa_idx" ON public."wa_auto_intents" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_intents" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_intents" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_intents" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n\nCREATE TABLE IF NOT EXISTS public."wa_auto_snapshots" (\n  "id" text NOT NULL,\n  "payload" text NOT NULL,\n  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,\n  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),\n  CONSTRAINT "wa_auto_snapshots_pkey" PRIMARY KEY (id)\n);\nALTER TABLE public."wa_auto_snapshots" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON public."wa_auto_snapshots" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_snapshots" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_snapshots_empresa_idx" ON public."wa_auto_snapshots" (empresa_id);\nDO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_snapshots" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_snapshots" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_snapshots" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;\n