-- Authenticated client creation for ProjectW1SC. Import source is distinguishable from a manual record.
create or replace function public.crm_create_client(p_name text,p_document text,p_institution text default null)
returns uuid
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare v_name text:=btrim(coalesce(p_name,''));
 v_doc text:=regexp_replace(coalesce(p_document,''),'[^0-9]','','g');
 v_id uuid;
begin
 if auth.uid() is null or not (
  lower(coalesce(auth.jwt()->>'email',''))='intermedioesenegociacoes@gmail.com'
  or exists(select 1 from public.crm_memberships m where m.user_id=auth.uid() and m.enabled)
 ) then raise exception 'Acesso não autorizado';end if;
 if length(v_name)<3 or length(v_name)>250 then raise exception 'Informe o nome completo';end if;
 if length(v_doc) not in (11,14) then raise exception 'Informe CPF/CNPJ válido em comprimento';end if;
 insert into public.crm_clients(source_key,name,doc_digits,institution,source_status,source_tab,
   source_spreadsheet,source_tabs,source_row_count,stage,workflow_status)
 values('doc:'||v_doc,v_name,v_doc,nullif(btrim(coalesce(p_institution,'')),''),
  'em_andamento','Cadastro manual','ProjectW1SC',array['Cadastro manual'],1,'a_analisar','ativo')
 returning id into v_id;
 insert into public.crm_activities(client_id,kind,body,actor_id,details)
 values(v_id,'cadastro','Cliente cadastrado manualmente no CRM.',auth.uid(),
   jsonb_build_object('origem','cadastro_manual'));
 return v_id;
end $$;
revoke all on function public.crm_create_client(text,text,text) from public,anon;
grant execute on function public.crm_create_client(text,text,text) to authenticated;
