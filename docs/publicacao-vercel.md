# Oferta Certa em produção

Publicado em 15/09/2026.

- Painel: https://oferta-certa-azure.vercel.app/painel
- Integrações: https://oferta-certa-azure.vercel.app/painel/integracoes
- Projeto Vercel: oferta-certa, na conta maiaslindo-4025s-projects, plano Hobby.
- Projeto: prj_s6MV7IoriyQfUJlpZaitQvOTlUQv.
- Deployment: dpl_FoMVK8HVYdVH9UMG93ddB4MDme7Y, status READY, produção.
- Framework: Next.js 16.3.4; Node.js 24; funções em São Paulo (gru1).
- Build remoto: concluído em 28 segundos.
- Código local sem repositório Git; publicação realizada pela ferramenta oficial Vercel CLI 59.17.0.

## Acesso e configurações

Use o mesmo usuário e senha da conta principal criada no painel local. O banco é o mesmo Supabase do Oferta Certa. Produtos, histórico, exportação e integrações exigem sessão autenticada.

As credenciais DATABASE_URL, MELI_CLIENT_SECRET e OAUTH_ENCRYPTION_KEY foram cadastradas como Secret apenas em Production. Não foram publicadas como arquivos ou variáveis NEXT_PUBLIC_. O arquivo .vercelignore exclui configurações locais, certificados privados, bancos locais, testes e relatórios do envio.

APP_ORIGIN=https://oferta-certa-azure.vercel.app

MELI_REDIRECT_URI=https://oferta-certa-azure.vercel.app/api/auth/mercadolivre/callback

PKCE está habilitado; histórico da API permanece desabilitado. A configuração local em .env.local continua com o endereço de desenvolvimento.

## Verificações

- Build local, TypeScript e lint aprovados.
- 14 testes unitários e de integração aprovados.
- 17 arquivos locais do navegador verificados sem credenciais privadas.
- Build remoto concluído; domínio de produção ativo com HTTPS.
- Página do painel conferida no Chrome: tela de entrada e banco na nuvem.
- API pública de status confirma banco na nuvem, conta principal existente e ausência de sessão para visitante.
- APIs de dados, exportação, integrações e início do OAuth retornam 401 sem login.
- Callback sem estado válido retorna ao domínio correto, sem autorizar uma conexão.
- POST com origem externa é rejeitado com 403.
- Solicitação de .env.local recebe a resposta not-found do Next.js; nenhum arquivo de credenciais é servido. Por ser uma resposta transmitida progressivamente, o status HTTP inicial é 200, com o marcador NEXT_HTTP_ERROR_FALLBACK;404 no documento.

Resultados automatizados em publicacao-vercel.json.

A consulta aos logs de nível error nos 15 minutos após a publicação não retornou registros. Não foi configurado um serviço adicional de monitoramento ou encaminhamento de logs.

## Pendência do Mercado Livre

O novo endereço foi preenchido na tela da aplicação, mas ainda precisa ser salvo com a confirmação dos termos e do CAPTCHA pelo usuário. Depois, entrar no painel público e iniciar uma nova autorização. A publicação não comprova a resolução do bloqueio CloudFront 403 observado no ambiente local.
