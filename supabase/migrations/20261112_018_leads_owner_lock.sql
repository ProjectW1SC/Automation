-- Evita transferência de propriedade dos leads por operadores ao editar etapas.
drop policy if exists crm_leads_update on public.crm_leads;
create policy crm_leads_update on public.crm_leads for update to authenticated
 using (
  (owner_id=(select auth.uid()) or exists (
   select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
  and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 )
 with check (
  (owner_id=(select auth.uid()) or exists (
   select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled and m.role='admin'))
  and exists(select 1 from public.crm_memberships m where m.user_id=(select auth.uid()) and m.enabled)
 );
