-- Express the literal separators with character classes to avoid backslash ambiguity.
alter table public.crm_completed_activities
 drop constraint if exists crm_completed_process_pair_check;
alter table public.crm_completed_activities
 add constraint crm_completed_process_pair_check
 check (
   (process_number is null and process_type is null)
   or (
     process_number ~ '^[0-9]{7}-[0-9]{2}[.][0-9]{4}[.][0-9][.][0-9]{2}[.][0-9]{4}$'
     and process_type in ('comum','busca_apreensao')
   )
 );
