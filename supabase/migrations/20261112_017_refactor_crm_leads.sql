-- CRM: integração não destrutiva com geradores W1, W2, W3 e buscas judiciais.
-- Toda escrita é autenticada; os registros ficam privados na carteira.
create table if not exists public.crm_leads(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 source_key text not null unique,
 source text not null check(source in ('w1','w2','w3','manual')),
 name text not null check(length(name)>=2),
 company text, phone text, email text, source_url text,
 source_detail text, interest text,
 stage text not null default 'novo' check(stage in ('novo','qualificado','contatado','proposta','convertido','perdido')),
 score integer not null default 0 check(score between 0 and 100),
 consent_at date,consent_source text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists crm_leads_stage_idx on public.crm_leads(stage,updated_at desc);
create index if not exists crm_leads_source_idx on public.crm_leads(source,created_at desc);
create table if not exists public.crm_process_candidates(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 source text not null default 'DJEN' check(source='DJEN'),
 process_number text not null check(process_number ~ '^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$'),
 query_term text not null,
 official_date date,
 tribunal text,headline text,evidence text,source_url text,external_ref text,
 created_at timestamptz not null default now(),
 unique(owner_id,process_number,query_term)
);
create index if not exists crm_process_candidates_date_idx on public.crm_process_candidates(official_date desc);
alter table public.crm_leads enable row level security;
alter table public.crm_process_candidates enable row level security;
revoke all on public.crm_leads,public.crm_process_candidates from public,anon;
grant select,insert,update,delete on public.crm_leads,public.crm_process_candidates to authenticated;
create policy crm_leads_read on public.crm_leads for select to authenticated using(
 exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_leads_insert on public.crm_leads for insert to authenticated with check(
 owner_id=(select auth.uid()) and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_leads_update on public.crm_leads for update to authenticated using(
 (owner_id=(select auth.uid()) or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
 and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 with check(exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_candidates_read on public.crm_process_candidates for select to authenticated using(
 exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_candidates_insert on public.crm_process_candidates for insert to authenticated with check(
 owner_id=(select auth.uid()) and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
create policy crm_candidates_update on public.crm_process_candidates for update to authenticated using(
 owner_id=(select auth.uid()) and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled));
comment on table public.crm_leads is 'Leads importados da W1/W2 ou pesquisados em fontes abertas W3, com procedência registrada e sem contatos privados inferidos.';
