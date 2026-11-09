-- Banco isolado da ProjectW1SC. Dados de clientes e provas nunca são enviados ao GitHub.
create extension if not exists pgcrypto;
create table if not exists public.crm_memberships(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'operator' check(role in ('admin','operator')),
 enabled boolean not null default true,
 created_at timestamptz not null default now());
create table if not exists public.crm_clients(
 id uuid primary key default gen_random_uuid(),source_key text not null unique,
 name text not null,doc_digits text,phone text,consultant text,
 institution text,contacted_party text,
 source_status text not null default 'em_andamento',source_tab text,
 source_spreadsheet text,source_conflict boolean not null default false,
 source_tabs text[] not null default '{}',source_row_count integer not null default 1,
 stage text not null default 'a_analisar' check(stage in ('a_analisar','contatado','em_negociacao','proposta_enviada','aguardando_resposta','concluido','arquivado')),
 sale_amount numeric(14,2),sale_date date,last_contact date,next_return date,
 debtor_balance numeric(14,2),estimated_amount numeric(14,2),current_amount numeric(14,2),
 last_negotiation date,notes text,
 evidence_status text not null default 'sem_validacao' check(evidence_status in ('sem_validacao','comprovante_recebido','quitacao_verificada','divergente')),
 evidence_url text,verified_at timestamptz,verified_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),source_seen_at timestamptz,
 constraint evidence_required_for_verification check (evidence_status <> 'quitacao_verificada' or (evidence_url is not null and length(trim(evidence_url))>0 and verified_at is not null))
);
create index if not exists crm_clients_status_idx on public.crm_clients(source_status);
create index if not exists crm_clients_next_return_idx on public.crm_clients(next_return);
create index if not exists crm_clients_doc_idx on public.crm_clients(doc_digits);
create table if not exists public.crm_activities(
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.crm_clients(id) on delete cascade,
 kind text not null default 'anotacao', body text not null,actor_id uuid references auth.users(id),
 created_at timestamptz not null default now());
create index if not exists crm_activities_client_idx on public.crm_activities(client_id,created_at desc);
create table if not exists public.crm_parties(
 id uuid primary key default gen_random_uuid(),name text not null,kind text not null check(kind in ('financeira','assessoria')),
 contact text,updated_at timestamptz not null default now(),unique(name,kind));
create table if not exists public.crm_import_runs(
 id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,
 source_file text not null,status text not null default 'executando',rows_read integer not null default 0,clients_merged integer not null default 0,error text);
create table if not exists public.crm_source_rows(
 source_ref text primary key,client_id uuid references public.crm_clients(id) on delete cascade,
 source_spreadsheet text not null,source_tab text not null,source_row integer not null,snapshot jsonb not null,
 seen_at timestamptz not null default now());
create index if not exists crm_source_rows_client_idx on public.crm_source_rows(client_id);
-- Apenas usuários autenticados da operação, não qualquer visitante autenticado.
-- O e-mail administrativo é verificado pelo Supabase Auth (não via user_metadata).
alter table public.crm_memberships enable row level security;
alter table public.crm_clients enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_parties enable row level security;
alter table public.crm_import_runs enable row level security;
alter table public.crm_source_rows enable row level security;
create policy crm_membership_select on public.crm_memberships for select to authenticated
 using(user_id=(select auth.uid()) or lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com');
create policy crm_membership_admin on public.crm_memberships for all to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com')
 with check(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com');
-- A leitura de crm_memberships é restringida pela própria política acima.
create policy crm_clients_access on public.crm_clients for all to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 with check(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_activities_access on public.crm_activities for all to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 with check(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_parties_access on public.crm_parties for all to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 with check(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_import_runs_read on public.crm_import_runs for select to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_source_rows_read on public.crm_source_rows for select to authenticated
 using(lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
-- Nenhuma permissão para anon. Serviço de sincronização usa somente chave de servidor.
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.crm_clients,public.crm_activities,public.crm_parties,public.crm_memberships to authenticated;
grant select on public.crm_import_runs,public.crm_source_rows to authenticated;
