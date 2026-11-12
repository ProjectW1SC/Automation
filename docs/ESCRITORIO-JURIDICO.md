# ProjectW1SC — gestão jurídica

Refatorado em 12/11/2026. O sistema antigo de quitações deixa de ser o painel do usuário. Os 206 registros de clientes financeiros permanecem no banco de dados original crm_clients para recuperação, sem migrar para a carteira jurídica office_clients. Evitar destruição irreversível.

## Telas
/, /clientes, /processos, /prazos, /audiencias, /pecas, /whatsapp, /leads, /gerador-processos, /superagente, /agentes, /relatorios, /captacao, /configuracoes.

## Tabelas
office_clients, office_cases, office_deadlines, office_documents, office_whatsapp_messages, office_agent_runs, office_intake. Todas possuem RLS. Apenas membros habilitados do escritório podem ler. Serviço WhatsApp/Captacao escreve usando service role exclusivamente no servidor. Sistema atual de um escritório, não de múltiplos locatários independentes.

## IA jurídica opcional
Configure na Vercel, somente servidor:
- LEGAL_AI_BASE_URL: endpoint HTTPS terminando em /chat/completions.
- LEGAL_AI_API_KEY: chave secreta de modelo compatível com API OpenAI.
- LEGAL_AI_MODEL: nome exato do modelo.

Sem estes valores, a minuta estruturada sem modelo continua disponível, mas a chamada generativa não funciona. O operador deve consentir explicitamente o envio de contexto à IA remota. Todas as peças requerem revisão humana de advogado. Não há protocolo automático.

## WhatsApp oficial da Meta
Configure WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, SUPABASE_SERVICE_ROLE_KEY, e opcional WHATSAPP_GRAPH_VERSION. Assine o webhook de messages no painel Meta, callback https://projectw1sc-crm.vercel.app/api/office/whatsapp/webhook. Webhook POST valida HMAC, GET valida token. Envio manual só após aprovação humana e dentro da janela de serviço de 24 horas. Não há envio de templates fora da janela.

## Captação pública por landing page
Configure NEXT_PUBLIC_TURNSTILE_SITE_KEY e TURNSTILE_SECRET_KEY do Cloudflare Turnstile, além de SUPABASE_SERVICE_ROLE_KEY na Vercel. Sem estas variáveis, formulário permanece desativado; nenhum SELECT ou INSERT anônimo direto no banco. Contatos com consentimento passam por triagem manual antes de converter em lead.

## Limites e segurança
- Credenciais de terceiros vistas em mensagens ou fornecidas em ENV.txt não devem ser reutilizadas; rotacione senhas e chaves expostas antes de configurar.
- Nunca utilizar API privada descobertas por falha de outro CRM, login de terceiros ou contorno de CAPTCHA.
- DJEN/DataJud podem atrasar e retornar 403/429; 0 resultados não comprova ausência de movimentação.
- Prazo judicial precisa conferência de intimação, expediente e feriados; uma data no sistema não substitui contagem oficial.
- Mini Agent é triagem determinística acionada por usuário, não modelo local 24h/7 dias nem cron agendado.
- O Superagente de evidências ainda não executa todo fluxo autônomo do LexisPredict.
- Coleta de dados pessoais de pessoas físicas via processos para contato não solicitado não faz parte da captação.
- Recursos dependentes de credenciais externas só poderão ser testados depois da configuração, nunca declarar disponibilidade a partir apenas do build.

## Verificação
GitHub Actions executa npm test e npm run build. Testar login real, RLS e webhooks de produção antes de operar com clientes.
