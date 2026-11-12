-- Cofre de sessão criptografada do WhatsApp vinculado via QR.
-- Nenhum acesso por anon/authenticated; somente Edge Functions com service-role.
create table if not exists public.office_wa_bridge_guard(
 name text primary key check(name='primary'),
 token_sha256 text not null check(token_sha256 ~ '^[a-f0-9]{64}$'),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.office_wa_bridge_guard enable row level security;
revoke all on public.office_wa_bridge_guard from anon,authenticated,public;

create table if not exists public.office_wa_encrypted_vault(
 name text primary key check(name='primary'),
 sealed text not null check(length(sealed) between 40 and 4500000),
 updated_at timestamptz not null default now()
);
alter table public.office_wa_encrypted_vault enable row level security;
revoke all on public.office_wa_encrypted_vault from anon,authenticated,public;
