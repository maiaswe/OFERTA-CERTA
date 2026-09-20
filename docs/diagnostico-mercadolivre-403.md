# Bloqueio na autorização do Mercado Livre

**Atualização de 15/09/2026:** o proprietário concluiu o OAuth no site publicado. O bloqueio de autorização descrito abaixo é histórico e não representa o estado atual. O problema pendente está nas permissões de consulta de anúncios; veja [diagnóstico de ofertas](mercadolivre-ofertas.md).

Verificação realizada em 15/09/2026, no Chrome do usuário.

## Atualização: site publicado

O Oferta Certa foi publicado em https://oferta-certa-azure.vercel.app/painel em 15/09/2026. O servidor já está configurado para o retorno público https://oferta-certa-azure.vercel.app/api/auth/mercadolivre/callback. Esse endereço foi preenchido no DevCenter, ainda pendente de salvar pelo usuário. É necessário testar uma nova autorização após salvar para confirmar se o 403 também ocorre em produção. As evidências abaixo se referem à tentativa com retorno local.

## Resultado

O botão Conectar Mercado Livre inicia o redirecionamento, mas o serviço de autorização do Mercado Livre responde com uma página HTML do CloudFront: HTTP 403, “Request blocked”. A tela de consentimento não aparece. A conexão ainda não foi concluída.

## Evidências verificadas

- Aplicação cadastrada: 7046681029899344.
- Endereço: https://auth.mercadolivre.com.br/authorization
- Retorno cadastrado e enviado: https://127.0.0.1:3000/api/auth/mercadolivre/callback
- Authorization Code e Refresh Token habilitados no cadastro.
- PKCE habilitado no cadastro e enviado com método S256.
- Parâmetros de autorização conferidos com a documentação oficial.
- Uma nova tentativa pelo botão do painel reproduziu o bloqueio.
- O site principal do Mercado Livre e o painel de desenvolvedores abriram normalmente no mesmo navegador.
- A consulta anterior ao banco não encontrou conexão OAuth nem eventos de troca de tokens.

Request ID da nova tentativa: `3F_RChzHaXOcmHpV0l0iPBLSQ0EQZWGxaqrXgP-PIpFrMbXq20xsdg==`

## Limite do diagnóstico

A resposta pública não identifica a regra ou a causa específica do bloqueio. Não há evidência suficiente para atribuí-lo à chave secreta, ao endereço local, à conta ou ao IP. Não foi identificado um defeito no gerador da URL que justifique alterar o fluxo. A investigação do Request ID depende do suporte do Mercado Livre.

Não foram alterados credenciais, permissões ou mecanismos de segurança.

## Texto para encaminhar ao suporte de desenvolvedores

Minha aplicação 7046681029899344 recebe uma página CloudFront HTTP 403 “Request blocked” ao iniciar Authorization Code com PKCE S256 em https://auth.mercadolivre.com.br/authorization. O bloqueio ocorre antes da tela de consentimento e antes do callback. O redirect_uri cadastrado e enviado é https://127.0.0.1:3000/api/auth/mercadolivre/callback. A ocorrência foi reproduzida em 15/09/2026; o site principal e o DevCenter funcionam no mesmo navegador. Request ID: 3F_RChzHaXOcmHpV0l0iPBLSQ0EQZWGxaqrXgP-PIpFrMbXq20xsdg==. Podem identificar a causa do bloqueio e confirmar os requisitos para esse endereço de retorno durante desenvolvimento local?

## Referência

https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao

Este relatório não contém chave secreta, tokens, cookies, código de autorização ou parâmetros temporários de sessão.
