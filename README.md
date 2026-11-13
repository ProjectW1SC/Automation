<div align="center">

<img src="./public/branding/infinitum-symbol-preto.svg" alt="INFINITUM" width="120" />

# INFINITUM

**Plataforma de inteligência operacional, CRM jurídico e automação de carteiras**

Organização de clientes, processos, atendimentos, captção de leads e rotinas de trabalho em um único ambiente — com foco em rastreabilidade, DataJud/DJEN e produtividade.

[**Acessar a aplicação**](https://projectw1sc-crm.vercel.app)

[![Licença: MIT](https://img.shields.io/badge/licença-MIT-0a0a0a)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)](https://supabase.com/)

</div>

---

## Sobre o projeto

O **INFINITUM** é a evolução do ambiente operacional W1 Capital / ProjectW1SC: uma plataforma para reunir carteira de clientes, processos judiciais, retornos, tarefas, captção e registros de atendimento em um fluxo claro e auditável.

A proposta é permitir que cada pessoa saiba **o que precisa fazer, por que aquilo é prioridade e o que já aconteceu em cada acompanhamento**. O sistema combina carteira centralizada, histórico de atividades, filtros operacionais, indicadores e consultas a fontes públicas (DataJud e DJEN), respeitando os limites de cada origem.

Não substitui a conferência de documentos originais nem presume pagamentos, movimentações ou contatos que não foram confirmados.

### Identidade visual

| Asset | Uso |
| --- | --- |
| `public/branding/infinitum-symbol-preto.svg` | Símbolo infinito (fundo claro) |
| `public/branding/infinitum-symbol-branco.svg` | Símbolo infinito (fundo escuro) |
| `public/branding/infinitum-horizontal-preto.png` | Logotipo horizontal completo |
| `public/branding/logo-ia-infinitum-branco.png` | Variante IA / wordmark branco |
| `public/branding/leadbroker-logotipo-preto.png` | Lead Broker (parceiro / módulo de leads) |
| `public/branding/leadbroker-logotipo-branco.png` | Lead Broker (fundo escuro) |

---

## Funcionalidades

| Área | O que você encontra |
| --- | --- |
| **Visão geral** | Indicadores da carteira, gráficos, retornos e acesso rápido aos acompanhamentos. |
| **Tarefas** | Fila de prioridades, vencimentos, registro de atendimento, edição e histórico. |
| **Clientes** | Cadastro, busca, filtros, detalhes das negociações e acompanhamento individual. |
| **Processos** | Cadastro de números CNJ e consultas às fontes públicas DataJud e DJEN. |
| **Captção / Leads** | Fluxos de entrada e integração com operações de lead (Lead Broker). |
| **Finalizados** | Registros encerrados, histórico e reabertura justificada. |
| **Instituições** | Financeiras, bancos, assessorias, contatos e imagens institucionais. |
| **Minhas atividades** | Registro e edição de atividades, com vínculo opcional a clientes e processos. |
| **Relatórios** | Resumos operacionais, indicadores por período, exportação e PDF. |
| **Configurações** | Preferências da conta, senha, foto, temas, cores e imagem de fundo. |
| **Integrações** | WhatsApp (bridge/status), Office AI, sincronização e scanners. |

Além das áreas principais: importação de Excel, origem dos registros e personalização visual sem alterar os dados da carteira.

---

## Tecnologias

- **Next.js e React** — páginas, componentes e interações
- **Supabase** — PostgreSQL, Auth, RLS e Storage privado
- **JavaScript / CSS** — regras operacionais, gráficos e identidade visual
- **Vercel** — hospedagem e deploy
- **Excel / Google Sheets** — importação e sincronização (quando autorizadas)
- **DataJud e DJEN** — consultas processuais públicas (sujeitas à disponibilidade)
- **WhatsApp bridge** — status, envio e webhook (quando configurados)

---

## Executar localmente

Requisitos: **Node.js 20+**, Git e um projeto Supabase configurado.

```bash
git clone https://github.com/ProjectW1SC/INFINITUM.git
cd INFINITUM
npm install
```

Crie `.env.local` a partir de `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

```bash
npm run dev
```

Abra `http://localhost:3000`. Sem Supabase e conta autorizada, as áreas protegidas não terão dados.

### Variáveis de ambiente

Consulte [`.env.example`](./.env.example). Principais:

| Variável | Finalidade |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (navegador + RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (somente servidor) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Credencial de planilhas (se houver) |
| `GOOGLE_SHEETS_IDS` | IDs das planilhas permitidas |
| `CRON_SECRET` | Proteção de rotas automatizadas |

**Nunca** publique `.env.local`, senhas ou chaves privilegiadas. Prefixo `NEXT_PUBLIC_` é exposto ao browser.

---

## Banco de dados e autenticação

Estruturas em [`supabase/migrations/`](./supabase/migrations). Aplique as migrações na ordem em um projeto sob seu controle.

- Supabase Auth + **Row Level Security (RLS)**
- Storage privado para fotos de perfil, fundos e imagens de instituições

Antes de dados reais:

1. Configure autenticação e contas autorizadas  
2. Aplique e revise migrações em ambiente de teste  
3. Confirme políticas RLS e buckets  
4. Verifique redirect URLs  
5. Faça backup antes de alterar produção  

---

## Estrutura do repositório

```text
app/                    Páginas e rotas (agenda, captção, processos, API…)
components/             Elementos compartilhados
lib/                    Regras, integrações e validações
public/branding/        Logotipos INFINITUM, Lead Broker e assets de login
supabase/migrations/    Schema e políticas
tests/                  Testes automatizados
```

---

## Testes e publicação

```bash
npm test
npm run build
```

Deploy pela **Vercel** a partir deste repositório. Configure as variáveis de ambiente na plataforma e valide o resultado antes de considerar a mudança concluída.

---

## Critérios de operação

- Finalizado = encerramento operacional, **não** quitação financeira comprovada  
- Status importado de planilha não substitui comprovante  
- Ausência em DataJud/DJEN ≠ ausência real de movimentação  
- Atendimentos devem ser registrados com dados reais; o sistema não envia mensagens automaticamente  
- Dados parciais devem ser apresentados como tais  

Não inclua dados pessoais, planilhas reais ou credenciais em commits ou exemplos públicos.

---

## Licença e direitos autorais

**© 2026 W1 Capital.** O código-fonte é distribuído sob a [Licença MIT](./LICENSE).

A marca **INFINITUM**, o símbolo infinito, o logotipo Lead Broker e demais elementos visuais de marca **não** são licenciados automaticamente pelo MIT do código. Respeite os direitos de titularidade antes de reutilizar.

---

<div align="center">

<img src="./public/branding/infinitum-symbol-preto.svg" alt="INFINITUM" width="48" />

**INFINITUM** · W1 Capital

</div>
