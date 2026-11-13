-- Schema isolado do Infinitum copiado para o Supabase principal LexisPredict.
-- Não altera tabelas preexistentes, não liga CRON e não contém registros de clientes.
-- A coluna empresa_id adicionada limita a visão de cada empresa pelo Supabase Auth do Lexis.

CREATE TABLE IF NOT EXISTS public."crm_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL,
  "kind" text DEFAULT 'anotacao'::text NOT NULL,
  "body" text NOT NULL,
  "actor_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_activities_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_activities" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_activities" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_activities" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_activities_empresa_idx" ON public."crm_activities" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_activities" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_activities" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_activities" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_clients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_key" text NOT NULL,
  "name" text NOT NULL,
  "doc_digits" text,
  "phone" text,
  "consultant" text,
  "institution" text,
  "contacted_party" text,
  "source_status" text DEFAULT 'em_andamento'::text NOT NULL,
  "source_tab" text,
  "source_spreadsheet" text,
  "source_conflict" boolean DEFAULT false NOT NULL,
  "source_tabs" text[] DEFAULT '{}'::text[] NOT NULL,
  "source_row_count" integer DEFAULT 1 NOT NULL,
  "stage" text DEFAULT 'a_analisar'::text NOT NULL,
  "sale_amount" numeric(14,2),
  "sale_date" date,
  "last_contact" date,
  "next_return" date,
  "debtor_balance" numeric(14,2),
  "estimated_amount" numeric(14,2),
  "current_amount" numeric(14,2),
  "last_negotiation" date,
  "notes" text,
  "evidence_status" text DEFAULT 'sem_validacao'::text NOT NULL,
  "evidence_url" text,
  "verified_at" timestamp with time zone,
  "verified_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source_seen_at" timestamp with time zone,
  "priority_level" text DEFAULT 'normal'::text NOT NULL,
  "workflow_status" text DEFAULT 'ativo'::text NOT NULL,
  "due_override" date,
  "assigned_to" text,
  "finished_at" timestamp with time zone,
  "finish_reason" text,
  "last_attendance_at" timestamp with time zone,
  "last_attended_by" uuid,
  "workflow_override" text,
  "closure_source" text,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_clients_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_clients_source_key_key" UNIQUE (source_key)
);
ALTER TABLE public."crm_clients" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_clients" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_clients" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_clients_empresa_idx" ON public."crm_clients" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_clients" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_clients" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_clients' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_clients" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_completed_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid DEFAULT auth.uid() NOT NULL,
  "client_id" uuid,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "category" text NOT NULL,
  "performed_on" date NOT NULL,
  "contact_confirmed" boolean DEFAULT false NOT NULL,
  "duration_seconds" integer DEFAULT 0 NOT NULL,
  "origin" text DEFAULT 'registro_manual_autodeclarado'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "process_number" text,
  "process_type" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_completed_activities_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_completed_activities" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_completed_activities" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_completed_activities" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_completed_activities_empresa_idx" ON public."crm_completed_activities" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_completed_activities" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_completed_activities" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_completed_activities' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_completed_activities" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_import_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "source_file" text NOT NULL,
  "status" text DEFAULT 'executando'::text NOT NULL,
  "rows_read" integer DEFAULT 0 NOT NULL,
  "clients_merged" integer DEFAULT 0 NOT NULL,
  "error" text,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_import_runs_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_import_runs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_import_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_import_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_import_runs_empresa_idx" ON public."crm_import_runs" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_import_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_import_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_import_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_import_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_judicial_snapshots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid DEFAULT auth.uid() NOT NULL,
  "process_number" text NOT NULL,
  "source" text NOT NULL,
  "query_key" text DEFAULT 'latest'::text NOT NULL,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "found" boolean DEFAULT false NOT NULL,
  "payload" jsonb NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_judicial_snapshots_actor_id_process_number_source_query_key" UNIQUE (actor_id, process_number, source, query_key),
  CONSTRAINT "crm_judicial_snapshots_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_judicial_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_judicial_snapshots" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_judicial_snapshots" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_judicial_snapshots_empresa_idx" ON public."crm_judicial_snapshots" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_judicial_snapshots" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_judicial_snapshots" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_judicial_snapshots' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_judicial_snapshots" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_leads" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "source_key" text NOT NULL,
  "source" text NOT NULL,
  "name" text NOT NULL,
  "company" text,
  "phone" text,
  "email" text,
  "source_url" text,
  "source_detail" text,
  "interest" text,
  "stage" text DEFAULT 'novo'::text NOT NULL,
  "score" integer DEFAULT 0 NOT NULL,
  "consent_at" date,
  "consent_source" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_leads_pkey" PRIMARY KEY (id),
  CONSTRAINT "crm_leads_source_key_key" UNIQUE (source_key)
);
ALTER TABLE public."crm_leads" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_leads" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_leads" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_leads_empresa_idx" ON public."crm_leads" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_leads" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_leads" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_leads' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_leads" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_memberships" (
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'operator'::text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_memberships_pkey" PRIMARY KEY (user_id)
);
ALTER TABLE public."crm_memberships" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_memberships" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_memberships" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_memberships_empresa_idx" ON public."crm_memberships" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_memberships" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_memberships" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_memberships' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_memberships" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_parties" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "contact" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "logo_path" text,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_parties_name_kind_key" UNIQUE (name, kind),
  CONSTRAINT "crm_parties_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_parties" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_parties" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_parties" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_parties_empresa_idx" ON public."crm_parties" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_parties" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_parties" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_parties' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_parties" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_process_candidates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "source" text DEFAULT 'DJEN'::text NOT NULL,
  "process_number" text NOT NULL,
  "query_term" text NOT NULL,
  "official_date" date,
  "tribunal" text,
  "headline" text,
  "evidence" text,
  "source_url" text,
  "external_ref" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "person_name" text,
  "person_name_source" text,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_process_candidates_owner_id_process_number_query_term_key" UNIQUE (owner_id, process_number, query_term),
  CONSTRAINT "crm_process_candidates_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_process_candidates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_process_candidates" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_process_candidates" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_process_candidates_empresa_idx" ON public."crm_process_candidates" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_process_candidates" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_process_candidates" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_process_candidates' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_process_candidates" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_processes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid DEFAULT auth.uid() NOT NULL,
  "process_number" text NOT NULL,
  "process_type" text NOT NULL,
  "client_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_processes_actor_id_process_number_key" UNIQUE (actor_id, process_number),
  CONSTRAINT "crm_processes_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."crm_processes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_processes" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_processes" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_processes_empresa_idx" ON public."crm_processes" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_processes" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_processes" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_processes' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_processes" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_source_rows" (
  "source_ref" text NOT NULL,
  "client_id" uuid,
  "source_spreadsheet" text NOT NULL,
  "source_tab" text NOT NULL,
  "source_row" integer NOT NULL,
  "snapshot" jsonb NOT NULL,
  "seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_source_rows_pkey" PRIMARY KEY (source_ref)
);
ALTER TABLE public."crm_source_rows" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_source_rows" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_source_rows" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_source_rows_empresa_idx" ON public."crm_source_rows" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_source_rows" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_source_rows" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_source_rows' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_source_rows" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."crm_unmatched_sources" (
  "source_ref" text NOT NULL,
  "source_file" text NOT NULL,
  "source_tab" text NOT NULL,
  "source_row" integer NOT NULL,
  "client_name" text,
  "possible_client_id" uuid,
  "reason" text NOT NULL,
  "snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "crm_unmatched_sources_pkey" PRIMARY KEY (source_ref)
);
ALTER TABLE public."crm_unmatched_sources" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."crm_unmatched_sources" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."crm_unmatched_sources" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_crm_unmatched_sources_empresa_idx" ON public."crm_unmatched_sources" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."crm_unmatched_sources" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."crm_unmatched_sources" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_unmatched_sources' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."crm_unmatched_sources" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_agent_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "agent" text NOT NULL,
  "task" text NOT NULL,
  "mode" text DEFAULT 'manual'::text NOT NULL,
  "status" text DEFAULT 'review'::text NOT NULL,
  "result" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "external_actions" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_agent_runs_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_agent_runs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_agent_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_agent_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_agent_runs_empresa_idx" ON public."office_agent_runs" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_agent_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_agent_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_agent_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_agent_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_cases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "client_id" uuid,
  "process_number" text,
  "title" text NOT NULL,
  "subject" text,
  "tribunal" text,
  "lawyer" text,
  "status" text DEFAULT 'ativo'::text NOT NULL,
  "next_review" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_cases_pkey" PRIMARY KEY (id),
  CONSTRAINT "office_cases_process_number_key" UNIQUE (process_number)
);
ALTER TABLE public."office_cases" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_cases" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_cases" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_cases_empresa_idx" ON public."office_cases" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_cases" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_cases" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cases' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_cases" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_clients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "document" text,
  "notes" text,
  "status" text DEFAULT 'ativo'::text NOT NULL,
  "next_return" date,
  "responsible" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_clients_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_clients" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_clients" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_clients" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_clients_empresa_idx" ON public."office_clients" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_clients" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_clients" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_clients' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_clients" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_cron_guard" (
  "name" text NOT NULL,
  "token_sha256" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_cron_guard_pkey" PRIMARY KEY (name)
);
ALTER TABLE public."office_cron_guard" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_cron_guard" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_cron_guard" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_cron_guard_empresa_idx" ON public."office_cron_guard" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_cron_guard" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_cron_guard" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_cron_guard' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_cron_guard" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_deadlines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "client_id" uuid,
  "case_id" uuid,
  "title" text NOT NULL,
  "due_on" date NOT NULL,
  "status" text DEFAULT 'aberto'::text NOT NULL,
  "priority" text DEFAULT 'normal'::text NOT NULL,
  "kind" text DEFAULT 'prazo'::text NOT NULL,
  "source" text,
  "source_url" text,
  "verified" boolean DEFAULT false NOT NULL,
  "notes" text,
  "responsible" text,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_deadlines_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_deadlines" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_deadlines" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_deadlines" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_deadlines_empresa_idx" ON public."office_deadlines" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_deadlines" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_deadlines" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_deadlines' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_deadlines" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_documents" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "case_id" uuid,
  "client_id" uuid,
  "title" text NOT NULL,
  "kind" text DEFAULT 'manifestacao'::text NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'rascunho'::text NOT NULL,
  "model_used" text,
  "external_ai_consent" boolean DEFAULT false NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_documents_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_documents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_documents" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_documents" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_documents_empresa_idx" ON public."office_documents" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_documents" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_documents" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_documents' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_documents" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_intake" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "practice_area" text NOT NULL,
  "message" text,
  "consent_at" timestamp with time zone DEFAULT now() NOT NULL,
  "consent_source" text DEFAULT 'formulario_publico'::text NOT NULL,
  "converted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_intake_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_intake" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_intake" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_intake" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_intake_empresa_idx" ON public."office_intake" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_intake" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_intake" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_intake' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_intake" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_official_backoff" (
  "actor_id" uuid NOT NULL,
  "process_number" text NOT NULL,
  "source" text NOT NULL,
  "status" integer NOT NULL,
  "failed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "retry_after" timestamp with time zone NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_official_backoff_pkey" PRIMARY KEY (actor_id, process_number, source)
);
ALTER TABLE public."office_official_backoff" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_official_backoff" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_official_backoff" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_official_backoff_empresa_idx" ON public."office_official_backoff" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_official_backoff" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_official_backoff" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_official_backoff' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_official_backoff" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_scan_runs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid DEFAULT auth.uid() NOT NULL,
  "process_number" text NOT NULL,
  "trigger_mode" text DEFAULT 'manual'::text NOT NULL,
  "source_status" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "review" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_scan_runs_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_scan_runs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_scan_runs" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_scan_runs" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_scan_runs_empresa_idx" ON public."office_scan_runs" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_scan_runs" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_scan_runs" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_scan_runs' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_scan_runs" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_source_cooldowns" (
  "source" text NOT NULL,
  "status" integer NOT NULL,
  "failed_at" timestamp with time zone NOT NULL,
  "retry_after" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_source_cooldowns_pkey" PRIMARY KEY (source)
);
ALTER TABLE public."office_source_cooldowns" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_source_cooldowns" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_source_cooldowns" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_source_cooldowns_empresa_idx" ON public."office_source_cooldowns" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_source_cooldowns" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_source_cooldowns" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_source_cooldowns' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_source_cooldowns" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_wa_chat_archive" (
  "owner_id" uuid NOT NULL,
  "jid" text NOT NULL,
  "name" text DEFAULT ''::text NOT NULL,
  "phone" text DEFAULT ''::text NOT NULL,
  "is_group" boolean DEFAULT false NOT NULL,
  "last_message" text DEFAULT ''::text NOT NULL,
  "last_message_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_wa_chat_archive_pkey" PRIMARY KEY (owner_id, jid)
);
ALTER TABLE public."office_wa_chat_archive" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_wa_chat_archive" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_wa_chat_archive" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_wa_chat_archive_empresa_idx" ON public."office_wa_chat_archive" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_wa_chat_archive" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_wa_chat_archive" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_chat_archive' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_wa_chat_archive" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_wa_message_archive" (
  "owner_id" uuid NOT NULL,
  "jid" text NOT NULL,
  "provider_message_id" text NOT NULL,
  "content" text DEFAULT ''::text NOT NULL,
  "is_from_me" boolean DEFAULT false NOT NULL,
  "media_type" text,
  "ack" smallint DEFAULT 0 NOT NULL,
  "timestamp" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_wa_message_archive_pkey" PRIMARY KEY (owner_id, jid, provider_message_id)
);
ALTER TABLE public."office_wa_message_archive" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_wa_message_archive" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_wa_message_archive" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_wa_message_archive_empresa_idx" ON public."office_wa_message_archive" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_wa_message_archive" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_wa_message_archive" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_wa_message_archive' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_wa_message_archive" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_whatsapp_messages" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid,
  "client_id" uuid,
  "provider_message_id" text,
  "phone" text NOT NULL,
  "display_name" text,
  "direction" text NOT NULL,
  "body" text DEFAULT ''::text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "status" text DEFAULT 'received'::text NOT NULL,
  "provider_status" text,
  "reviewed_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_whatsapp_messages_pkey" PRIMARY KEY (id),
  CONSTRAINT "office_whatsapp_messages_provider_message_id_key" UNIQUE (provider_message_id)
);
ALTER TABLE public."office_whatsapp_messages" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_whatsapp_messages" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_whatsapp_messages" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_whatsapp_messages_empresa_idx" ON public."office_whatsapp_messages" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_whatsapp_messages" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_whatsapp_messages" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_whatsapp_messages' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_whatsapp_messages" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."office_workflow_cards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" uuid DEFAULT auth.uid() NOT NULL,
  "case_id" uuid,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "stage" text DEFAULT 'entrada'::text NOT NULL,
  "card_type" text DEFAULT 'tarefa'::text NOT NULL,
  "priority" text DEFAULT 'normal'::text NOT NULL,
  "due_on" date,
  "assigned_to" text,
  "source" text DEFAULT 'manual'::text NOT NULL,
  "external_ref" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "office_workflow_cards_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."office_workflow_cards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."office_workflow_cards" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."office_workflow_cards" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_office_workflow_cards_empresa_idx" ON public."office_workflow_cards" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."office_workflow_cards" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."office_workflow_cards" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='office_workflow_cards' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."office_workflow_cards" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."wa_auto_config" (
  "id" text NOT NULL,
  "secret_hash" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "wa_auto_config_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."wa_auto_config" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wa_auto_config" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_config" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_config_empresa_idx" ON public."wa_auto_config" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_config" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_config" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_config' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_config" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."wa_auto_intents" (
  "id" text NOT NULL,
  "kind" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "wa_auto_intents_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."wa_auto_intents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wa_auto_intents" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_intents" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_intents_empresa_idx" ON public."wa_auto_intents" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_intents" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_intents" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_intents' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_intents" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."wa_auto_snapshots" (
  "id" text NOT NULL,
  "payload" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "empresa_id" uuid NOT NULL DEFAULT public.get_user_empresa_id(),
  CONSTRAINT "wa_auto_snapshots_pkey" PRIMARY KEY (id)
);
ALTER TABLE public."wa_auto_snapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."wa_auto_snapshots" FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public."wa_auto_snapshots" TO authenticated;
CREATE INDEX IF NOT EXISTS "infinitum_wa_auto_snapshots_empresa_idx" ON public."wa_auto_snapshots" (empresa_id);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_select') THEN
  CREATE POLICY infinitum_lexis_select ON public."wa_auto_snapshots" FOR SELECT TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_insert') THEN
  CREATE POLICY infinitum_lexis_insert ON public."wa_auto_snapshots" FOR INSERT TO authenticated WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='wa_auto_snapshots' AND policyname='infinitum_lexis_update') THEN
  CREATE POLICY infinitum_lexis_update ON public."wa_auto_snapshots" FOR UPDATE TO authenticated USING (empresa_id = (SELECT public.get_user_empresa_id())) WITH CHECK (empresa_id = (SELECT public.get_user_empresa_id()));
 END IF;
END $$;
