# Infinitum + LexisPredict — base principal compartilhada (13/11/2026)

## Arquitetura validada
- Supabase principal (LexisPredict): projeto `segjskjlbeydlljnefai`; plano Pro já contratado.
- Supabase anterior Infinitum: projeto `ulkuhiibeoibbzhqrfya`; **preservado como backup, sem apagamento**.
- 29 tabelas exclusivas do Infinitum e 462 registros replicados no principal, contagem e digest verificados em 29/29 tabelas. As 61 tabelas originais Lexis permaneceram intactas.
- Foram criadas políticas RLS por `empresa_id` e índices somente nas tabelas novas. Não foi concedido `DELETE` aos usuários autenticados nessas tabelas.
- Os dados da empresa de 10 usuários e da empresa de 1 usuário seguem separados. Os 206 clientes históricos do Infinitum pertencem à empresa do login correspondente, **não são mesclados entre empresas**.
- A conta do Supabase Auth antigo que não corresponde a um login existente no Lexis não foi importada nem substituída. Use exclusivamente a autenticação existente do Lexis.

## Comportamento
- Páginas `/`, `/clientes`, `/processos` e `/relatorios` usam componentes compartilhados quando o modo é ativado.
- `/clientes`: processos do Lexis associados a clientes e, separadamente, 206 clientes históricos do Infinitum, sem união por nome ambíguo.
- `/processos`: busca paginada por cliente/CNJ/tribunal, edição, atendimento, encerramento e arquivamento lógico (reversível). Dados jurídicos são apresentados com status interno original. A consulta manual reconhece CNJs do Lexis quando pertencem à empresa autenticada.
- O histórico de processos é gravado em `tarefas_realizadas` por RPC transacional: data, responsável do login, descrição, confirmação de contato e próximo retorno. O registro de cliente histórico é transacional e usa `crm_activities` e `crm_clients`.
- `/relatorios`: indicadores por período e empresa, CSV/PDF por impressão, e componente **TeamReport copiado do LexisPredict** com dados adaptados. O relatório completo original do Lexis (painéis Hermes, auditoria avançada, Omni, cálculos e PDFs específicos) **ainda não foi integralmente portado**; não apresentar isso como pronto.

## Como ativar em nova hospedagem/ambiente de teste
1. Preservar o backup dos dois projetos.
2. Definir somente na implantação de teste:
   `NEXT_PUBLIC_LEXIS_SHARED_DB=1`
   `NEXT_PUBLIC_SUPABASE_URL=https://segjskjlbeydlljnefai.supabase.co`
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave pública ativa deste projeto>`.
3. Reconfigurar segredos de servidor necessários para o projeto principal **sem nunca publicá-los** em código, repositório, `NEXT_PUBLIC_*` ou mensagens.
4. Atualizar as URLs de redirecionamento de Auth Google/OAuth do Lexis para o novo domínio, mantendo o login idêntico.
5. Fazer teste real com pelo menos dois usuários da mesma empresa e um de empresa diferente: acesso, edição, consulta CNJ, atendimento, retorno, exclusão lógica e recuperação. Nunca habilitar conta de outra empresa por e-mail.
6. Não ativar tarefas CRON ou scanners duplicados; manter manual/sob demanda durante a validação de custos.
7. Somente após testes, promover a implantação e configurar domínio final. O Vercel está pausado; a base de dados migrada não destrava o deploy.

## Pendências e preservação
- Uma referência de objeto de Storage e buckets do Supabase antigo permanecem no projeto anterior; não houve transferência dos bytes desse objeto.
- Tarefas e scanners que dependem da API Node.js/Vercel exigem verificação da compatibilidade com Cloudflare Workers antes de publicá-los.
- Logs originais e IDs dos registros importados foram mantidos, inclusive IDs antigos que não correspondem mais a `auth.users` principal; tais registros são apresentados como legados.
- Não há garantia de consumo adicional zero ao conectar dois aplicativos ao Supabase; a solução evita a contratação automática de outro plano e reduz duplicação de dados e consultas.
- A funcionalidade é ativada apenas por flag; **nenhuma configuração de produção foi alterada para redirecionar o Infinitum**.
