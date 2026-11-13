# Demonstração e ativação da conta de convidado

A empresa de demonstração está **separada dos escritórios reais** pelo identificador da empresa e pelas políticas RLS.

## Ativação preferencial no aplicativo

1. Entre com a conta **Superadmin** do escritório real no Infinitum.
2. Acesse `/demo-admin` e clique em **Criar ou renovar senha do convidado**.
3. Confirme a alteração. O servidor usa a API administrativa do Supabase Auth em função Edge protegida por JWT, nunca no navegador.
4. Copie imediatamente o e-mail e a senha gerada, guarde num gerenciador de senhas e use-os para entrar no CRM.
5. Não fotografe nem publique a senha. Renovar a conta invalida a senha anterior.

Se a função regional ou a permissão administrativa estiver indisponível, use o procedimento manual abaixo. A existência do perfil no banco não significa que já exista uma conta de login.

---

# Ativação de conta de convidado — INFINITUM

Empresa demonstrativa: **Aurora & Horizonte Advocacia — DEMONSTRAÇÃO FICTÍCIA**.

Todos os registros da carteira foram criados no projeto Supabase da W1 Capital, em um `empresa_id` separado. O login no Supabase Auth exige uma etapa administrativa.

1. Abra [Supabase W1 Capital · Authentication · Users](https://supabase.com/dashboard/project/segjskjlbeydlljnefai/auth/users), entre com permissões administrativas, clique **Add user**, selecione usuário por e-mail e senha, digite **`convidado.infinitum@example.com`**, defina uma senha nova com pelo menos 12 caracteres e habilite **Auto Confirm User**.
2. Sem copiar a senha para o GitHub nem para o ChatGPT, abra [SQL Editor](https://supabase.com/dashboard/project/segjskjlbeydlljnefai/sql/new) no mesmo projeto e execute o SQL abaixo. Ele falha se o usuário não existir, não estiver confirmado ou pertencer a outro perfil.
3. Verifique o resultado `auth_vinculado=true` e `demo=true`. Entre em [INFINITUM](https://agentinfinitum.vercel.app) usando o e-mail e a senha que você escolheu. A aba de processos terá apenas os 48 cadastros fictícios; nenhuma consulta DJEN/DataJud externa é disparada para esta organização.

**Importante:** o SQL é idempotente depois da primeira associação; atua só sobre registros com o `empresa_id` da demonstração. Execute-o apenas no banco de dados W1 Capital indicado. Não altere `auth.users` manualmente via SQL. Processos, publicações, prazos e decisões de demonstração não são evidência jurídica.

```sql
-- Use SOMENTE depois de criar e confirmar o e-mail no Supabase Auth (Authentication > Users).
-- Restrito ao tenant de demonstracao. NUNCA altera registros de empresas reais.
BEGIN;
DO $bind_demo$
DECLARE
 v_company uuid := 'b889c08e-7378-47f1-9830-a03f87abb18f'::uuid;
 v_placeholder uuid := '11111111-1111-4111-8111-111111111111'::uuid;
 v_auth uuid;
 v_profile uuid;
BEGIN
 SELECT id INTO STRICT v_auth FROM auth.users
 WHERE lower(email)='convidado.infinitum@example.com' AND email_confirmed_at IS NOT NULL AND is_anonymous=false;
 IF NOT EXISTS (SELECT 1 FROM public.empresas
    WHERE id=v_company AND branding->>'infinitum_demo'='true') THEN
   RAISE EXCEPTION 'Empresa fictícia não validada';
 END IF;
 SELECT id INTO STRICT v_profile FROM public.usuarios
 WHERE empresa_id=v_company AND lower(email)='convidado.infinitum@example.com';
 IF EXISTS(SELECT 1 FROM public.usuarios WHERE auth_user_id=v_auth AND id<>v_profile) THEN
   RAISE EXCEPTION 'Identidade já pertence a outro perfil';
 END IF;
 IF EXISTS(SELECT 1 FROM public.usuarios
   WHERE id=v_profile AND auth_user_id NOT IN (v_placeholder,v_auth)) THEN
   RAISE EXCEPTION 'O perfil demo já está associado a outra identidade';
 END IF;
 UPDATE public.office_clients SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_cases SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_deadlines SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_documents SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_workflow_cards SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_whatsapp_messages SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_agent_runs SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.office_scan_runs SET actor_id=v_auth WHERE empresa_id=v_company AND actor_id=v_placeholder;
 UPDATE public.crm_judicial_snapshots SET actor_id=v_auth WHERE empresa_id=v_company AND actor_id=v_placeholder;
 UPDATE public.crm_leads SET owner_id=v_auth WHERE empresa_id=v_company AND owner_id=v_placeholder;
 UPDATE public.crm_completed_activities SET actor_id=v_auth WHERE empresa_id=v_company AND actor_id=v_placeholder;
 UPDATE public.tarefas_realizadas SET responsavel_auth_user_id=v_auth WHERE empresa_id=v_company AND responsavel_auth_user_id=v_placeholder;
 UPDATE public.crm_tarefas SET created_by=v_auth::text WHERE empresa_id=v_company AND created_by=v_placeholder::text;
 UPDATE public.crm_tarefas SET assignee_id=v_auth::text WHERE empresa_id=v_company AND assignee_id=v_placeholder::text;
 UPDATE public.crm_atividades SET created_by=v_auth::text WHERE empresa_id=v_company AND created_by=v_placeholder::text;
 UPDATE public.usuarios SET auth_user_id=v_auth WHERE id=v_profile AND empresa_id=v_company;
END $bind_demo$;
COMMIT;
SELECT e.nome,e.id,e.branding->>'infinitum_demo' AS demo,
 u.email,u.cargo,u.role,(u.auth_user_id=a.id) AS auth_vinculado
FROM public.empresas e
JOIN public.usuarios u ON u.empresa_id=e.id
JOIN auth.users a ON a.email=u.email AND a.id=u.auth_user_id
WHERE e.id='b889c08e-7378-47f1-9830-a03f87abb18f'::uuid;
```
