-- ProjectW1SC: pessoas convidadas permanecem no mesmo banco, com autorização individual.
-- Para conceder acesso, inserir o e-mail apenas no banco privado, sem versionar dados pessoais.
create schema if not exists crm_internal;
revoke all on schema crm_internal from public, anon, authenticated;

create table if not exists crm_internal.pending_users (
 email text primary key check(email=lower(email) and position('@' in email)>1),
 role text not null default 'operator' check(role in ('admin','operator')),
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
revoke all on crm_internal.pending_users from public, anon, authenticated;

create or replace function crm_internal.sync_invited_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and lower(coalesce(old.email,'')) is distinct from lower(coalesce(new.email,''))
    and exists(select 1 from crm_internal.pending_users p where p.email=lower(old.email)) then
  update public.crm_memberships set enabled=false where user_id=new.id;
 end if;
 if new.email_confirmed_at is not null then
  insert into public.crm_memberships (user_id,role,enabled)
  select new.id,p.role,true from crm_internal.pending_users p
   where p.email=lower(new.email) and p.enabled
  on conflict (user_id) do update set role=excluded.role,enabled=true;
 end if;
 return new;
end $$;
revoke all on function crm_internal.sync_invited_user() from public,anon,authenticated;
drop trigger if exists crm_sync_invited_user on auth.users;
create trigger crm_sync_invited_user
after insert or update of email,email_confirmed_at on auth.users
for each row execute function crm_internal.sync_invited_user();

-- Recupera a associação caso uma conta convidada já exista e tenha confirmado o e-mail.
insert into public.crm_memberships(user_id,role,enabled)
select u.id,p.role,true from auth.users u
join crm_internal.pending_users p on p.email=lower(u.email)
where u.email_confirmed_at is not null and p.enabled
on conflict(user_id) do update set role=excluded.role,enabled=true;

-- Administradores autorizados enxergam a mesma carteira, independentemente de quem cadastrou.
drop policy if exists crm_processes_admin_read on public.crm_processes;
create policy crm_processes_admin_read on public.crm_processes
 for select to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));
drop policy if exists crm_processes_admin_update on public.crm_processes;
create policy crm_processes_admin_update on public.crm_processes
 for update to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
 with check(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));
drop policy if exists crm_processes_admin_delete on public.crm_processes;
create policy crm_processes_admin_delete on public.crm_processes
 for delete to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));

drop policy if exists crm_completed_admin_read on public.crm_completed_activities;
create policy crm_completed_admin_read on public.crm_completed_activities
 for select to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));
drop policy if exists crm_completed_admin_update on public.crm_completed_activities;
create policy crm_completed_admin_update on public.crm_completed_activities
 for update to authenticated using(deleted_at is null and exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
 with check(performed_on<=((now() at time zone 'America/Sao_Paulo')::date) and exists(
 select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));

drop policy if exists crm_source_rows_member_admin_write on public.crm_source_rows;
create policy crm_source_rows_member_admin_write on public.crm_source_rows
 for all to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
 with check(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));
drop policy if exists crm_unmatched_member_admin_write on public.crm_unmatched_sources;
create policy crm_unmatched_member_admin_write on public.crm_unmatched_sources
 for all to authenticated using(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
 with check(exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));

drop policy if exists crm_logo_member_admin_insert on storage.objects;
create policy crm_logo_member_admin_insert on storage.objects
 for insert to authenticated with check(bucket_id='crm-institution-logos' and
 (storage.foldername(name))[1]='parties' and exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));
drop policy if exists crm_logo_member_admin_delete on storage.objects;
create policy crm_logo_member_admin_delete on storage.objects
 for delete to authenticated using(bucket_id='crm-institution-logos' and
 exists(select 1 from public.crm_memberships m
 where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'));

-- Preserva a função original de importação, ampliando apenas a verificação de administrador.
CREATE OR REPLACE FUNCTION public.crm_import_excel(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 r jsonb;
 v_doc text;
 v_name text;
 v_ref text;
 v_tab text;
 v_status text;
 v_id uuid;
 v_added integer:=0;
 v_unmatched integer:=0;
 v_institution text;
 v_phone text;
 v_contact text;
 v_note text;
 v_tags text[];
begin
 if auth.uid() is null or not (lower(coalesce(auth.jwt()->>'email','')) = 'intermedioesenegociacoes@gmail.com' or exists(select 1 from public.crm_memberships m where m.user_id=auth.uid() and m.enabled and m.role='admin')) then
  raise exception 'Acesso não autorizado à importação.';
 end if;
 if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows)>150 then
  raise exception 'Envie entre 1 e 150 registros por vez.';
 end if;
 for r in select value from jsonb_array_elements(p_rows)
 loop
  v_doc:=regexp_replace(coalesce(r->>'doc_digits',''),'[^0-9]','','g');
  v_name:=left(btrim(coalesce(r->>'name','')),250);
  v_ref:=left(btrim(coalesce(r->>'source_ref','')),700);
  v_tab:=left(btrim(coalesce(r->>'source_tab','')),125);
  v_status:=coalesce(nullif(r->>'source_status',''),'historico');
  v_institution:=left(coalesce(r->>'institution',''),180);
  v_phone:=left(coalesce(r->>'phone',''),100);
  v_contact:=left(coalesce(r->>'contacted_party',''),180);
  v_note:=left(coalesce(r->>'notes',''),5000);
  if v_ref='' or v_name='' or v_tab='' then continue; end if;
  if length(v_doc) not in (11,14) then
   insert into public.crm_unmatched_sources(source_ref,source_file,source_tab,source_row,client_name,reason,snapshot)
   values (v_ref,'Excel - importação autorizada',v_tab,coalesce((r->>'source_row')::integer,0),v_name,'Documento ausente/inválido; revisar antes de associar',r)
   on conflict(source_ref) do update set snapshot=excluded.snapshot,reason=excluded.reason;
   v_unmatched:=v_unmatched+1;
   continue;
  end if;
  v_tags:=ARRAY['Excel: '||v_tab];
  insert into public.crm_clients (
   source_key,name,doc_digits,phone,consultant,institution,contacted_party,
   source_status,source_tab,source_spreadsheet,source_conflict,source_tabs,source_row_count,
   sale_amount,sale_date,last_contact,next_return,debtor_balance,estimated_amount,
   current_amount,notes,source_seen_at
  )
  values (
   'doc:'||v_doc,v_name,v_doc,v_phone,left(coalesce(r->>'consultant',''),150),v_institution,v_contact,
   v_status,v_tab,'Excel - importação autorizada',(v_tab='Inconsistência'),v_tags,1,
   nullif(r->>'sale_amount','')::numeric,nullif(r->>'sale_date','')::date,
   nullif(r->>'last_contact','')::date,nullif(r->>'next_return','')::date,
   nullif(r->>'debtor_balance','')::numeric,nullif(r->>'estimated_amount','')::numeric,
   nullif(r->>'current_amount','')::numeric,v_note,now()
  )
  on conflict(source_key) do update set
   phone=coalesce(nullif(public.crm_clients.phone,''),nullif(excluded.phone,'')),
   consultant=coalesce(nullif(public.crm_clients.consultant,''),nullif(excluded.consultant,'')),
   institution=coalesce(nullif(public.crm_clients.institution,''),nullif(excluded.institution,'')),
   contacted_party=coalesce(nullif(public.crm_clients.contacted_party,''),nullif(excluded.contacted_party,'')),
   sale_amount=coalesce(public.crm_clients.sale_amount,excluded.sale_amount),
   sale_date=coalesce(public.crm_clients.sale_date,excluded.sale_date),
   last_contact=coalesce(public.crm_clients.last_contact,excluded.last_contact),
   next_return=coalesce(public.crm_clients.next_return,excluded.next_return),
   debtor_balance=coalesce(public.crm_clients.debtor_balance,excluded.debtor_balance),
   estimated_amount=coalesce(public.crm_clients.estimated_amount,excluded.estimated_amount),
   current_amount=coalesce(public.crm_clients.current_amount,excluded.current_amount),
   notes=coalesce(nullif(public.crm_clients.notes,''),nullif(excluded.notes,'')),
   source_tabs=(select array_agg(distinct tag) from unnest(public.crm_clients.source_tabs||excluded.source_tabs) as tag),
   source_conflict=public.crm_clients.source_conflict or excluded.source_conflict
     or (excluded.source_status='quitado_na_planilha' and public.crm_clients.source_status in ('em_andamento','vencido'))
     or (public.crm_clients.source_status='quitado_na_planilha' and excluded.source_status in ('em_andamento','vencido')),
   updated_at=now(),source_seen_at=now()
  returning id into v_id;
  insert into public.crm_source_rows(source_ref,client_id,source_spreadsheet,source_tab,source_row,snapshot,seen_at)
  values(v_ref,v_id,'Excel - importação autorizada',v_tab,coalesce((r->>'source_row')::integer,0),r,now())
  on conflict(source_ref) do update set client_id=excluded.client_id,snapshot=excluded.snapshot,seen_at=now();
  v_added:=v_added+1;
 end loop;
 return jsonb_build_object('processed',v_added,'need_review',v_unmatched);
end; $function$
;
