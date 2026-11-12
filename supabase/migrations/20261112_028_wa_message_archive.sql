-- Histórico durável do WhatsApp por usuário; não depende da sessão do Render.
-- Migration already applied to ProjectW1SC Supabase on 2026-11-12.
create table if not exists public.office_wa_chat_archive (
  owner_id uuid not null references auth.users(id) on delete cascade,
  jid text not null check(length(jid) between 6 and 200 and jid ~ '@(s[.]whatsapp[.]net|g[.]us|lid|c[.]us)$'),
  name text not null default '' check(length(name)<=240),
  phone text not null default '' check(length(phone)<=32),
  is_group boolean not null default false,
  last_message text not null default '' check(length(last_message)<=4000),
  last_message_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(owner_id,jid)
);
create index if not exists office_wa_chat_archive_recent_idx on public.office_wa_chat_archive(owner_id,last_message_at desc nulls last);
create table if not exists public.office_wa_message_archive (
  owner_id uuid not null,jid text not null,
  provider_message_id text not null check(length(provider_message_id) between 1 and 180),
  content text not null default '' check(length(content)<=4000),
  is_from_me boolean not null default false,
  media_type text check(media_type is null or length(media_type)<=80),
  ack smallint not null default 0 check(ack between 0 and 3),
  timestamp timestamptz not null,updated_at timestamptz not null default now(),
  primary key(owner_id,jid,provider_message_id),
  foreign key(owner_id,jid) references public.office_wa_chat_archive(owner_id,jid) on delete cascade
);
create index if not exists office_wa_message_archive_recent_idx on public.office_wa_message_archive(owner_id,jid,timestamp desc);
alter table public.office_wa_chat_archive enable row level security;
alter table public.office_wa_message_archive enable row level security;
revoke all on public.office_wa_chat_archive,public.office_wa_message_archive from public,anon;
grant select,insert,update,delete on public.office_wa_chat_archive,public.office_wa_message_archive to authenticated;
create policy office_wa_chat_archive_select on public.office_wa_chat_archive for select to authenticated
 using (owner_id=(select auth.uid()) and public.office_has_access());
create policy office_wa_chat_archive_insert on public.office_wa_chat_archive for insert to authenticated
 with check (owner_id=(select auth.uid()) and public.office_has_access());
create policy office_wa_chat_archive_update on public.office_wa_chat_archive for update to authenticated
 using (owner_id=(select auth.uid()) and public.office_has_access())
 with check (owner_id=(select auth.uid()) and public.office_has_access());
create policy office_wa_message_archive_select on public.office_wa_message_archive for select to authenticated
 using (owner_id=(select auth.uid()) and public.office_has_access());
create policy office_wa_message_archive_insert on public.office_wa_message_archive for insert to authenticated
 with check (owner_id=(select auth.uid()) and public.office_has_access());
create policy office_wa_message_archive_update on public.office_wa_message_archive for update to authenticated
 using (owner_id=(select auth.uid()) and public.office_has_access())
 with check (owner_id=(select auth.uid()) and public.office_has_access());
comment on table public.office_wa_chat_archive is 'Chats observados pelo WA.Auto e arquivados no CRM para consulta entre aparelhos.';
comment on table public.office_wa_message_archive is 'Mensagens observadas, nao necessariamente historico completo de outros dispositivos.';
