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

## Uso simples

- Entre com `intermedioesenegociacoes@gmail.com` (link de acesso por e-mail Supabase Auth). Configure o Site URL e o redirecionamento dessa aplicação nas configurações Auth do Supabase.
- As planilhas já consultadas foram conciliadas inicialmente no Supabase. Para uma nova versão do Excel, use **Importar Excel** na tela: leitura local no navegador, gravação autenticada com RLS e conciliação pelo documento; nenhuma prova de quitação é presumida.
- O botão de sincronização automática foi removido porque ainda não existe credencial Google de servidor autorizada no projeto. Não há sincronização Google Sheets em segundo plano até configurar um acesso de serviço seguro.
- O Excel original foi importado como cópia privada para o Drive GET, preservando o arquivo anexado.

## Fila de tarefas e prioridades

Acesse `/tarefas` após entrar com a conta autorizada. A central operacional é baseada nos padrões de fila da W1/W2 LexisPredict, adaptados à negociação de quitações (sem informações jurídicas fictícias).

- **Prioridades**: vencidos primeiro, depois os retornos de hoje, em dia e casos sem data. A prioridade manual Alta/Urgente reorganiza cada faixa.
- **Só vencidos**: reúne **apenas** os retornos com data anterior à data atual de São Paulo. O marcador VENCIDOS de uma planilha não basta sem data confirmada; casos sem data ficam na fila própria.
- **Em dia / Hoje / Sem data / Finalizados**: situação operacional derivada do retorno, independentemente do rótulo financeiro e da quitação.
- **Editar**: dados de contato, financeira, escritório, consultor, prioridade, responsável, observações e data do próximo retorno. A data operacional prevalece sem apagar a origem importada.
- **Registrar atendimento**: descreve contato ou tentativa, canal, resultado, responsável e próximo retorno (sugestão editável de 30 dias). Uma transação salva a atividade e a nova data; se falhar, nada é considerado concluído.
- **Finalizar/Reabrir**: exige um motivo e gera registro. Finalizar acompanhamento **não comprova pagamento** nem muda `evidence_status`.
- **Histórico**: mostra atendimentos, alterações e finalizações; não envia WhatsApp, ligações ou e-mails automaticamente.

Persistência: `supabase/migrations/20261109_003_fila_atendimentos.sql` no Project One. Funções RPC `crm_update_client` e `crm_register_attendance` usam permissões do usuário autenticado (RLS; sem `SECURITY DEFINER`). `npm test` cobre a ordenação, classificação e validação de registro. Fuso: `America/Sao_Paulo`.

## Visual Motion — referências e limites (09/11/2026)

Visual modernizado com CSS próprio, **sem copiar ou redistribuir** templates/componentes pagos:

- [Code and Chill](https://codeandchill.store/): linguagem de realce de abas, botões com feedback e microinterações.
- [CodeXR / Topmate](https://topmate.io/code_xr): transições de navegação e componentes interativos.
- [Build Index](https://buildindex.dev/): profundidade de cartões e informações operacionais claras em dashboards.

O design original `app/motion-system.css` mantém vinho/marfim e a navegação única da ProjectW1SC. A animação aparece somente quando há interação ou carregamento: realce da aba ativa, entrada breve da página e das primeiras linhas, hover/foco, formulário/modal, estado de loading. Não usa imagens pesadas, vídeos, dependências extras de animação nem rede externa. Inclui `prefers-reduced-motion: reduce`, foco visível e atalhos de teclado (setas/Home/End) nas abas de fila. Contadores continuam exibindo valores reais, não simulações.

Validação: `npm test`, `npm run build` e verificação da implantação da Vercel. O visual no navegador autenticado deve ser conferido com dados reais antes de considerar encerrada a revisão de UX.

## Conciliação de finalizados e reabertura — 09/11/2026

O CRM agora apresenta **Finalizados** no lugar de **Revisar**. A página só contém acompanhamentos com `workflow_status='finalizado'`, permite buscar, consultar histórico e **Reabrir** após informar um motivo. Os links antigos `/?aba=revisar` e `/revisar` apontam para Finalizados.

**Cruzamento privado por CPF/CNPJ:** Google Sheets `QUITAÇÃO - KAWAN 2025` versus cópia Google Sheets autorizada do Excel `Estatistica Quitacao 2025`. Na leitura: 43 documentos distintos em VENCIDOS, 80 em FINALIZADOS, 28 em QUITADOS; 5 aparecem simultaneamente em VENCIDOS e QUITADOS. A aba Excel Quitados tem 29 documentos com status explicitamente `Quitado`, nenhum deles coincidindo com VENCIDOS da planilha principal. Outros estados (`Aproximado`, abas de risco, `QUITAÇÃO IRREVERSIVEL`) **não** confirmam pagamento.

**Banco Project One:** 90 acompanhamentos existentes foram classificados como finalizados com registros de auditoria. O número de datas atrasadas na fila ativa caiu de 113 para 52; 61 datas antigas pertenciam a registros encerrados. Não houve alteração automática de `evidence_status` ou comprovação financeira.

Migrações `004` e `005` preservam a decisão manual de **Reabrir** (`workflow_override='ativo'`) e classificam futuras importações apenas quando a origem explicitamente sinaliza finalização/quitação. **Reabrir** é uma decisão operacional, não uma reversão da quitação. A importação massiva de novas pessoas fora do banco depende de um canal autorizado para dados pessoais; não inserir CPFs em repositórios públicos.

A antiga tabela de documentos sem CPF/CNPJ não aparece mais em Finalizados; esses registros permanecem na base privada para eventual reconciliação separada.
