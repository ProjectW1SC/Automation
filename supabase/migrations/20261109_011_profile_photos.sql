-- Profile images are private and accessible only under the authenticated user's UUID.
-- Names/passwords live in Supabase Auth user_metadata/password, never in public tables.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('crm-profile-photos','crm-profile-photos',false,2097152,ARRAY['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists crm_photo_select_own on storage.objects;
drop policy if exists crm_photo_insert_own on storage.objects;
drop policy if exists crm_photo_delete_own on storage.objects;

create policy crm_photo_select_own on storage.objects
 for select to authenticated
 using (
  bucket_id='crm-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 );
create policy crm_photo_insert_own on storage.objects
 for insert to authenticated
 with check (
  bucket_id='crm-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 );
create policy crm_photo_delete_own on storage.objects
 for delete to authenticated
 using (
  bucket_id='crm-profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
 );
