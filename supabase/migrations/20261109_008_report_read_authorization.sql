-- Relatório por empresa exige leitura autorizada das atividades de todos
-- os executores, sem abrir os registros para usuários anônimos nem usuários externos.
alter table public.crm_completed_activities enable row level security;
drop policy if exists crm_completed_select_company_admin on public.crm_completed_activities;
create policy crm_completed_select_company_admin
on public.crm_completed_activities
for select to authenticated
using (lower(coalesce((select auth.jwt()->>'email'),''))='intermedioesenegociacoes@gmail.com');
comment on table public.crm_completed_activities is
 'Tarefas realizadas com executor autenticado. Membros veem as próprias tarefas; administrador ProjectW1SC pode consolidar a empresa no /report.';
