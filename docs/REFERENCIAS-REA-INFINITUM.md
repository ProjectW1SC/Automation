# Referências de reconstrução visual e REA — ProjectW1SC

## Materiais fornecidos
- Imagem 1353x642: login duas colunas; painel esquerdo preto/cinza marmorizado, texto grande, rodapé de funcionalidades; formulário direito branco, logo infinito, email, senha, olho, lembrar-me, cadastro, recuperação e Google.
- Vídeo ~321 s 1360x768: sidebar compacta/expandida, indicadores, POP com cards e fases, automações, integrações, Swagger público, central IA.
- PART 1 a 5: bundles JS/CSS compilados. Trechos inspecionados exibem React, LiveKit, DnD Kit/sortable, animações, cartões e classes utilitárias, não o fonte completo de um app licenciado para republicação.
- SUPERAGENTE, IA INFINITUM.txt: HTML de interface com rail, Nova conversa, Ibots, busca, habilidades, modelos, conectores e casos. Usado como referência de layout.

## Implementação independente
- Login: components/professional-auth.jsx, components/secured-workspace.jsx, app/infinitum-login.css e fundo original public/branding/office-marble.svg.
- POP: components/office-kanban.jsx, Supabase office_workflow_cards com RLS.
- Integração: components/office-integrations.jsx, GET autenticado em /api/office/infinitum e recursos limitados ao Swagger público anexo. Sem extração de endpoints privados.
- Superagente: app/superagente/page.jsx e API original: motor determinístico com registros oficiais autorizados. Sem alegar LLM local.
- Justiça: consulta automática com backoff de 403/429, distinção DJEN/DataJud e aviso de consulta parcial.

## REA
Fonte oficial: https://github.com/morluto/rea. A CLI exige Node 22.x >=22.23.4, 24.x >=24.22.1 ou 26.12.1+. O ambiente disponível usa Node 22.16.0, então a CLI REA **não foi instalada nem executada**. Foi realizada inspeção estática dos arquivos anexados e dos quadros da gravação. Igualdade visual pixel a pixel não foi comprovada por navegador autenticado.

## Segurança, segredos e direitos
- O URL de IA enviado contém um token de acesso em query string. Revogue/rotacione o token e emita outro para a organização autorizada antes de configurar INFINITUM_PUBLIC_TOKEN na Vercel. Não salvar no GitHub nem incluir tokens no cliente.
- A segunda imagem mostra certificado TLS do domínio (Amazon Root CA), não certificado digital OAB para uso judicial.
- A documentação REST pública não implica permissão para copiar banco de terceiro, usar APIs internas ou contornar captcha.
- Integrações WhatsApp Meta, Google OAuth e IA generativa dependem de credenciais e permissões configuradas. O projeto não finge disponibilidade dessas funcionalidades.
- O DJEN pode bloquear a rede; DataJud fornece metadados alternativos, nunca confirmação substitutiva de publicações DJEN.
