-- Gerador misto: o CHECK antigo rejeitava DataJud, causando erro no REST.
-- Não apagar registros; preservar restrições de CNJ, UNIQUE e RLS.
alter table public.crm_process_candidates
 drop constraint if exists crm_process_candidates_source_check;
alter table public.crm_process_candidates
 add constraint crm_process_candidates_source_check
 check (source in ('DJEN','DataJud'));
create index if not exists crm_process_candidates_owner_date
 on public.crm_process_candidates(owner_id,official_date desc);
