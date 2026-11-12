-- Landing page jurídica: solicitações recebidas com consentimento explícito.
-- Sem insert anônimo direto: apenas API que valida Turnstile utiliza chave service_role no servidor.
create table if not exists public.office_intake(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 160),
 email text check(email is null or length(email)<=180),
 phone text check(phone is null or length(phone)<=25),
 practice_area text not null check(practice_area in ('civil','trabalhista','familia','consumidor','previdenciario','empresarial','outro')),
 message text check(message is null or length(message)<=900),
 consent_at timestamptz not null default now(),
 consent_source text not null default 'formulario_publico',
 converted_at timestamptz,
 created_at timestamptz not null default now(),
 check(email is not null or phone is not null)
);
create index if not exists office_intake_created_idx on public.office_intake(created_at desc);
alter table public.office_intake enable row level security;
revoke all on public.office_intake from public,anon;
grant select,update on public.office_intake to authenticated;
create policy office_intake_read on public.office_intake for select to authenticated using(public.office_has_access());
create policy office_intake_update on public.office_intake for update to authenticated
 using(public.office_has_access()) with check(public.office_has_access());
comment on table public.office_intake is 'Contatos que solicitaram retorno no site jurídico, após consentimento e desafio anti-bot. Não extrai dados pessoais de processos judiciais.';
