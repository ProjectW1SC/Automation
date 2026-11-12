-- Escritório jurídico independente do CRM legado de quitações.
-- Não migra automaticamente clientes financeiros ou apaga dados antigos.
-- Escopo atual: uma carteira interna compartilhada por membros habilitados.
create or replace function public.office_has_access() returns boolean
 language sql stable security invoker set search_path=public,pg_temp as $$
 select (select auth.uid()) is not null and (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists (select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 );
 $$;
create or replace function public.office_is_admin() returns boolean
 language sql stable security invoker set search_path=public,pg_temp as $$
 select (select auth.uid()) is not null and (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists (select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled and m.role='admin')
 );
 $$;
revoke all on function public.office_has_access(),public.office_is_admin() from public,anon;
grant execute on function public.office_has_access(),public.office_is_admin() to authenticated;
create table if not exists public.office_clients(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 name text not null check(length(trim(name)) between 2 and 180),
 phone text, email text, document text, notes text,
 status text not null default 'ativo' check(status in ('ativo','arquivado')),
 next_return date, responsible text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists office_clients_name_idx on public.office_clients(name);
create index if not exists office_clients_next_return_idx on public.office_clients(next_return) where status='ativo';
create table if not exists public.office_cases(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 client_id uuid references public.office_clients(id) on delete set null,
 process_number text unique check(process_number is null or process_number ~ '^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$'),
 title text not null check(length(trim(title)) between 3 and 250),
 subject text,tribunal text,lawyer text,
 status text not null default 'ativo' check(status in ('ativo','suspenso','encerrado')),
 next_review date,
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists office_cases_client_idx on public.office_cases(client_id);
create index if not exists office_cases_review_idx on public.office_cases(next_review) where status='ativo';
create table if not exists public.office_deadlines(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 client_id uuid references public.office_clients(id) on delete set null,
 case_id uuid references public.office_cases(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 250),
 due_on date not null,
 status text not null default 'aberto' check(status in ('aberto','concluido','cancelado')),
 priority text not null default 'normal' check(priority in ('normal','alta','urgente')),
 kind text not null default 'prazo' check(kind in ('prazo','audiencia','retorno','tarefa')),
 source text, source_url text, verified boolean not null default false,
 notes text, responsible text,
 completed_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists office_deadlines_due_idx on public.office_deadlines(due_on,priority) where status='aberto';
create index if not exists office_deadlines_case_idx on public.office_deadlines(case_id);
create table if not exists public.office_documents(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 case_id uuid references public.office_cases(id) on delete set null,
 client_id uuid references public.office_clients(id) on delete set null,
 title text not null check(length(trim(title)) between 3 and 200),
 kind text not null default 'manifestacao' check(kind in ('peticao_inicial','contestacao','recurso','manifestacao','procuracao','contrato','relatorio','outro')),
 body text not null default '',
 evidence jsonb not null default '{}'::jsonb,
 status text not null default 'rascunho' check(status in ('rascunho','revisao','aprovado')),
 model_used text, external_ai_consent boolean not null default false,
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists office_documents_case_idx on public.office_documents(case_id,created_at desc);
create table if not exists public.office_whatsapp_messages(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references auth.users(id),
 client_id uuid references public.office_clients(id) on delete set null,
 provider_message_id text unique,
 phone text not null check(length(phone) between 10 and 16),
 display_name text,
 direction text not null check(direction in ('inbound','outbound')),
 body text not null default '' check(length(body)<=4000),
 received_at timestamptz not null default now(),
 status text not null default 'received',
 provider_status text,reviewed_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists office_whatsapp_messages_thread_idx on public.office_whatsapp_messages(phone,received_at desc);
create table if not exists public.office_agent_runs(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 agent text not null check(length(agent) between 2 and 60),
 task text not null check(length(task) between 3 and 300),
 mode text not null default 'manual' check(mode in ('manual','scheduled')),
 status text not null default 'review' check(status in ('review','ready','partial','failed')),
 result jsonb not null default '{}'::jsonb,
 sources jsonb not null default '[]'::jsonb,
 external_actions integer not null default 0 check(external_actions>=0),
 created_at timestamptz not null default now()
);
create index if not exists office_agent_runs_created_idx on public.office_agent_runs(created_at desc);
-- Sem permissões públicas e sem função de apagar em massa.
do $grant$
declare rel text;
begin
 for rel in select unnest(array['office_clients','office_cases','office_deadlines','office_documents','office_whatsapp_messages','office_agent_runs']) loop
  execute format('alter table public.%I enable row level security',rel);
  execute format('revoke all on public.%I from public,anon',rel);
  execute format('grant select,insert,update,delete on public.%I to authenticated',rel);
  execute format('create policy %I on public.%I for select to authenticated using (public.office_has_access())',rel||'_read',rel);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.office_has_access() and owner_id=(select auth.uid()))',rel||'_insert',rel);
  execute format('create policy %I on public.%I for update to authenticated using (public.office_has_access() and (owner_id=(select auth.uid()) or public.office_is_admin())) with check (public.office_has_access() and (owner_id=(select auth.uid()) or public.office_is_admin()))',rel||'_update',rel);
  execute format('create policy %I on public.%I for delete to authenticated using (public.office_is_admin())',rel||'_delete',rel);
 end loop;
end $grant$;
comment on table public.office_clients is 'Carteira jurídica nova, separada de crm_clients de quitações.';
comment on table public.office_deadlines is 'Prazos exigem conferência humana. Uma data digitada ou detectada não substitui intimação judicial.';
comment on table public.office_documents is 'Minutas submetidas a revisão de advogado. Nenhuma peça é protocolada automaticamente.';
