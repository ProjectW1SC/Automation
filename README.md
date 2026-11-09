<div align="center">

<img src="./public/branding/projectw1sc-wordmark.svg" alt="Logotipo ProjectW1SC" width="96" />

# ProjectW1SC

**CRM de negociações, relacionamento e acompanhamento operacional**

Uma plataforma para organizar a carteira de clientes, acompanhar pendências, registrar atendimentos e transformar informações dispersas em uma rotina de trabalho clara e rastreável.

[**Acessar o CRM**](https://projectw1sc-crm.vercel.app)

[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-682a47)](./LICENSE)

</div>

---

## Sobre o projeto

O ProjectW1SC nasceu da necessidade de reunir, em um só ambiente, as informações que fazem parte do dia a dia de uma operação de negociações: contatos, instituições, retornos, tarefas, registros de atendimento e relatórios.

A proposta é simples: permitir que cada pessoa saiba **o que precisa fazer, por que aquilo é prioridade e o que já aconteceu em cada acompanhamento**. Para isso, o sistema combina uma carteira centralizada, histórico de atividades, filtros operacionais e indicadores calculados a partir dos registros disponíveis.

O CRM também permite importar planilhas e consultar informações processuais públicas, respeitando os limites de cada fonte. Não substitui a conferência dos documentos originais nem presume a existência de pagamentos, movimentações ou contatos que não foram confirmados.

## Funcionalidades

| Área | O que você encontra |
| --- | --- |
| **Visão geral** | Indicadores da carteira, gráficos, retornos e acesso rápido aos acompanhamentos. |
| **Tarefas** | Fila de prioridades, vencimentos, registro de atendimento, edição e histórico de ações. |
| **Clientes** | Cadastro, busca, filtros, detalhes das negociações e acompanhamento individual. |
| **Processos** | Cadastro de números CNJ e consultas às fontes públicas DataJud e DJEN, quando disponíveis. |
| **Finalizados** | Registros encerrados, consulta ao histórico e reabertura justificada. |
| **Instituições** | Cadastro de financeiras, bancos, assessorias, contatos e imagens institucionais. |
| **Minhas atividades** | Registro, consulta e edição de atividades, com vínculo opcional a clientes e processos. |
| **Relatórios** | Resumos operacionais, indicadores por período, exportação e versão preparada para PDF. |
| **Configurações** | Preferências da conta, senha, foto, temas, cores e imagem de fundo. |

Além das áreas principais, a aplicação oferece importação de Excel, acompanhamento da origem dos registros e personalização visual. A aparência pode ser alterada sem modificar os dados da carteira.

## Tecnologias utilizadas

- **Next.js e React:** páginas, componentes e interações do sistema.
- **Supabase:** banco de dados PostgreSQL, autenticação, políticas de acesso (RLS) e armazenamento privado de arquivos.
- **JavaScript e CSS:** regras operacionais, gráficos e identidade visual.
- **Vercel:** hospedagem e publicação da aplicação.
- **Excel e Google Sheets:** fontes de importação e integração, conforme as permissões e credenciais configuradas.
- **DataJud e DJEN:** consultas a informações processuais públicas, sujeitas à disponibilidade e às regras das fontes oficiais.

## Executar localmente

Para trabalhar no projeto, é necessário ter o **Node.js 20 ou superior**, o Git e acesso a um projeto Supabase devidamente configurado.

```bash
git clone https://github.com/ProjectW1SC/Automation.git
cd Automation
npm install
```

Crie o arquivo `.env.local` a partir do modelo `.env.example` e preencha **somente as credenciais do seu próprio ambiente**. No Windows, você pode fazer a cópia com:

```powershell
Copy-Item .env.example .env.local
```

Em seguida, inicie a aplicação:

```bash
npm run dev
```

Abra `http://localhost:3000` no navegador. Sem um Supabase configurado e uma conta autorizada, as áreas protegidas não terão acesso aos registros.

### Variáveis de ambiente

O arquivo [`.env.example`](./.env.example) reúne os nomes das configurações utilizadas pelo projeto. Entre as principais estão:

| Variável | Finalidade |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase, utilizada no navegador em conjunto com RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada, restrita ao servidor e a operações autorizadas. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Credencial de serviço, quando houver integração autorizada com planilhas. |
| `GOOGLE_SHEETS_IDS` | Identificadores das planilhas permitidas para sincronização. |
| `CRON_SECRET` | Proteção de chamadas automatizadas, quando configuradas. |

**Importante:** nunca publique arquivos `.env.local`, senhas, tokens ou chaves privilegiadas. Variáveis com o prefixo `NEXT_PUBLIC_` podem ser expostas ao navegador e não devem conter segredos.

## Banco de dados e autenticação

As estruturas e regras do banco estão versionadas em [`supabase/migrations/`](./supabase/migrations). Em uma instalação nova, as migrações precisam ser aplicadas **na ordem correta**, em um projeto Supabase sob seu controle.

O sistema utiliza o Supabase Auth para identificação dos usuários e políticas **Row Level Security (RLS)** para limitar o acesso aos dados. O armazenamento de imagens de perfil, fundos personalizados e imagens de instituições também utiliza áreas privadas do Supabase Storage.

Antes de usar a aplicação com dados reais:

1. Configure a autenticação e as contas que terão permissão de acesso.
2. Aplique e revise as migrações do banco em um ambiente de teste.
3. Confirme as políticas RLS e as permissões dos buckets de arquivos.
4. Verifique os endereços de redirecionamento da autenticação.
5. Realize um backup antes de migrar ou alterar uma base de produção.

A existência de uma sessão autenticada não deve ser tratada, por si só, como autorização para acessar todos os registros. As permissões precisam ser conferidas também no banco e nas rotas do servidor.

## Estrutura do repositório

```text
app/
  page.jsx                 Tela inicial e navegação por abas
  tarefas/                 Fila de atendimento
  processos/               Acompanhamento processual
  minhas-atividades/       Registro de atividades
  report/                  Relatórios
  configuracoes/           Preferências e conta
  api/                     Rotas executadas no servidor
components/                Elementos compartilhados das telas
lib/                       Regras, cálculos, integrações e validações
public/themes/             Identidade visual e imagens dos temas
supabase/migrations/       Estrutura e regras do banco de dados
tests/                     Testes automatizados
```

Algumas áreas, como **Clientes**, **Finalizados** e **Instituições**, compartilham componentes da página inicial. Por isso, nem todas as abas correspondem a uma pasta independente.

Para localizar um ponto específico, comece por [`lib/crm-navigation.mjs`](./lib/crm-navigation.mjs) e [`components/reference-pages.jsx`](./components/reference-pages.jsx).

## Testes e publicação

Antes de publicar uma alteração, execute:

```bash
npm test
npm run build
```

Os testes verificam regras como classificação de prazos, autenticação, tratamento de dados, relatórios e partes da interface. Eles ajudam a identificar problemas, mas não substituem a revisão visual e funcional no navegador.

A publicação é realizada pela **Vercel**, a partir do repositório GitHub conectado ao projeto. Configure as variáveis de ambiente necessárias na plataforma e confira o resultado da implantação antes de considerar uma mudança concluída.

A sincronização com planilhas depende de credenciais válidas e de autorização explícita às fontes. Uma rota de integração presente no código **não significa** que a sincronização automática esteja habilitada ou funcionando continuamente.

## Critérios de operação

O ProjectW1SC foi desenvolvido para manter uma distinção importante entre **informação registrada** e **informação comprovada**.

- Um acompanhamento marcado como finalizado representa o encerramento da rotina operacional; não comprova quitação financeira.
- Um status importado de planilha não substitui a análise de um comprovante.
- A ausência de resultados em DataJud ou DJEN não significa necessariamente ausência de movimentações no processo.
- Ações de atendimento precisam ser registradas com dados reais. O sistema não envia mensagens, e-mails ou ligações automaticamente.
- Informações parciais ou indisponíveis devem ser apresentadas como tais, sem preenchimento fictício.

Os dados dos clientes pertencem ao ambiente privado de operação. Não inclua informações pessoais, planilhas reais, documentos ou credenciais em commits, exemplos públicos ou solicitações de suporte.

## Evolução do projeto

As melhorias são desenvolvidas de maneira incremental, procurando preservar os dados existentes e manter a operação estável. Correções, novas funcionalidades e ajustes visuais devem passar por revisão, testes e verificação da implantação.

O objetivo do ProjectW1SC é continuar evoluindo como uma ferramenta de trabalho **prática, organizada e confiável**, com atenção à segurança, à rastreabilidade e à experiência de quem utiliza o CRM todos os dias.

---

## Licença e direitos autorais

**© 2026 W1 Capital.** O código-fonte original do ProjectW1SC é distribuído sob a [Licença MIT (MIT License)](./LICENSE). É permitido estudar, modificar, compartilhar e utilizar o software nos termos dessa licença, preservando os avisos de copyright.

A marca ProjectW1SC/W1 Capital, seus logotipos, obras visuais de personagens e marcas de terceiros não recebem automaticamente uma licença de reutilização comercial pela licença MIT do código. Respeite os direitos de seus titulares.
