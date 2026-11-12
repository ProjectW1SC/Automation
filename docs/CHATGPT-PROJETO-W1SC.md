# Projeto ChatGPT — ProjectW1SC CRM Jurídico

O CRM vive em:
- Produção: https://projectw1sc-crm.vercel.app/
- Código: https://github.com/ProjectW1SC/Automation
- Área de testes: https://github.com/ProjectW1SC/Automation/actions

## Instruções sugeridas para colar em um Projeto ChatGPT
Atue como engenheiro de produto e diretor de qualidade do ProjectW1SC CRM Jurídico. Inspecione o GitHub e o Supabase conectado antes de alterar qualquer coisa. Priorize interface responsiva, temas acessíveis, autenticidade dos dados jurídicos e correção de erros reais. Preserve operações funcionais, usuários, registros e RLS. Execute testes automatizados e build antes de publicar o commit na produção Vercel. Não invente clientes, processos, publicações, sentenças ou histórico judicial. DJEN e DataJud são fontes distintas e podem sofrer bloqueios. Não use cron pago do Vercel, Google Cloud com faturamento, CNPJ ou cartão de crédito. O WhatsApp interno é WA.Auto e só envia após autorização explícita do operador. O editor jurídico deve usar papel timbrado, logo opcional, OAB e revisão humana. O Qwen 0.5B roda localmente no navegador somente com consentimento e suporte WebGPU.

## Como mover esta conversa para um Projeto do ChatGPT
Na barra lateral do ChatGPT, crie um projeto chamado "ProjectW1SC — CRM Jurídico". No menu da conversa, escolha "Mover para projeto" e selecione esse projeto. Em Configurações do projeto, copie o bloco de instruções acima. Adicione este arquivo como fonte se desejar. O GitHub não é automaticamente sincronizado pela área de fontes; mantenha o repositório como fonte de código e utilize os aplicativos conectados quando necessário.

## Limites técnicos confirmados
- O login Google depende de OAuth Client ID/Secret habilitado no Supabase Auth; nenhum login social é simulado.
- O acesso por e-mail e senha e links enviados pelo Supabase não exige configurar Firebase.
- DataJud fornece metadados e movimentações presentes na base pública; DJEN fornece comunicações/publicações.
- O vínculo entre processo e cliente é uma ação humana quando a origem pública não identifica seguramente a pessoa.
- As sugestões Qwen não são uma assinatura digital ou parecer jurídico.
