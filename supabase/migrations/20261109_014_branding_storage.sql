-- Brand logos are uploaded only by approved CRM users and served as signed URLs.
alter table public.crm_parties add column if not exists logo_path text;
alter table public.crm_parties drop constraint if exists crm_parties_logo_path_format;
alter table public.crm_parties add constraint crm_parties_logo_path_format
 check(logo_path is null or logo_path ~ '^parties/[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp)$');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('crm-institution-logos','crm-institution-logos',false,2097152,ARRAY['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('crm-backgrounds','crm-backgrounds',false,3145728,ARRAY['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists crm_institution_logos_select on storage.objects;
drop policy if exists crm_institution_logos_insert on storage.objects;
drop policy if exists crm_institution_logos_delete on storage.objects;
create policy crm_institution_logos_select on storage.objects for select to authenticated using (
 bucket_id='crm-institution-logos' and (
  lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 ));
create policy crm_institution_logos_insert on storage.objects for insert to authenticated with check (
 bucket_id='crm-institution-logos' and (storage.foldername(name))[1]='parties'
 and lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
 );
create policy crm_institution_logos_delete on storage.objects for delete to authenticated using (
 bucket_id='crm-institution-logos' and
 lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com'
 );
drop policy if exists crm_backgrounds_select_own on storage.objects;
drop policy if exists crm_backgrounds_insert_own on storage.objects;
drop policy if exists crm_backgrounds_delete_own on storage.objects;
create policy crm_backgrounds_select_own on storage.objects for select to authenticated
 using(bucket_id='crm-backgrounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy crm_backgrounds_insert_own on storage.objects for insert to authenticated
 with check(bucket_id='crm-backgrounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy crm_backgrounds_delete_own on storage.objects for delete to authenticated
 using(bucket_id='crm-backgrounds' and (storage.foldername(name))[1]=(select auth.uid())::text);
