# ProjectW1SC CRM — Negociações e Quitações

CRM operacional privado para intermediação de quitações. React/Next.js + Supabase + Google Sheets + Vercel. Projeto próprio inspirado em conceitos de OpenCRM (MIT), SuiteCRM e Twenty; **nenhum código de terceiros foi copiado**.

## Fontes e interpretação confirmada (09/11/2026)
- Planilha 1: QUITAÇÃO - KAWAN 2025, 5 abas: ANDAMENTO, VENCIDOS, QUITADOS, FINALIZADOS, FINANCEIRAS.
- Planilha 2: ID cadastrado, porém Google Drive retornou 403 em duas conexões; permanece **pendente de autorização**, sem criar dados fictícios.
- Coluna **T** em ANDAMENTO/VENCIDOS indica **financeira ou escritório contatado**, não andamento processual; em FINALIZADOS corresponde à assessoria.
- QUITADOS possui cabeçalhos repetidos e ordenação própria. Uma linha na aba não constitui comprovante de quitação.
- Existem duplicações entre abas, células inválidas com 1899 e linhas sem documento; a importação conservadora evita criar status jurídicos/financeiros falsos.
- O Drive GET possui arquivos com título de quitação, mas a verificação de pagamento depende de documento/evidência individual.

## Configuração
1. Criar um projeto Supabase **na organização ProjectW1SC**; aplicar `supabase/migrations/20261109_001_crm.sql` pelo SQL Editor/MCP; habilitar Email OTP e confirmar o usuário administrador `intermedioesenegociacoes@gmail.com`.
2. Configurar na Vercel as variáveis de `.env.example`. **Nunca** colocar `SUPABASE_SERVICE_ROLE_KEY`, credenciais Google ou tokens em `NEXT_PUBLIC_`.
3. Autorizar as planilhas à conta de serviço Google com acesso somente leitura, ou utilizar OAuth de usuário autorizado. O login Google conectado ao ChatGPT **não concede automaticamente tokens ao site implantado**.
4. Implantar pelo GitHub e executar **Sincronizar** no CRM com o usuário administrador. Cron diário 11:00 UTC (08:00 de São Paulo, sem horário de verão), sujeito aos limites do plano Hobby da Vercel.
5. Se qualquer planilha estiver indisponível, o painel indica **sincronização parcial**, sem afirmar atualização completa.

## Privacidade
Repositório público contém **somente código e mapeamento de estrutura**; não armazena nomes, CPFs, contratos, comprovantes, listas de clientes nem chaves. Banco com RLS e autenticação. Nenhuma mensagem é enviada automaticamente. Dados provenientes de terceiros só devem ser importados se houver autorização para o tratamento e compartilhamento na operação ProjectW1SC.

## Comandos
`npm install` · `npm run dev` · `npm test` · `npm run build`.
