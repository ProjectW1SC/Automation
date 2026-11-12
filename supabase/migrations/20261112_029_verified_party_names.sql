-- Preserve owner-scoped candidates, add separately sourced party identity.
alter table public.crm_process_candidates add column if not exists person_name text;
alter table public.crm_process_candidates add column if not exists person_name_source text;
alter table public.crm_process_candidates drop constraint if exists crm_process_candidates_person_name_length;
alter table public.crm_process_candidates add constraint crm_process_candidates_person_name_length check (person_name is null or length(trim(person_name)) between 2 and 180);
alter table public.crm_process_candidates drop constraint if exists crm_process_candidates_person_name_source_check;
alter table public.crm_process_candidates add constraint crm_process_candidates_person_name_source_check check (person_name_source is null or person_name_source in ('DJEN_parte','DJEN_destinatario','operador'));
create index if not exists crm_process_candidates_person_name_idx on public.crm_process_candidates(owner_id,person_name) where person_name is not null;
