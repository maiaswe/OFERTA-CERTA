# Chamado ao suporte humano — Oferta Certa

**Estado: preparado, ainda não enviado. Nenhum protocolo humano obtido.**

**Assunto:** 403 access_denied em anúncios de terceiros — App 7046681029899344

Olá, equipe de Developers do Mercado Livre.

Solicitamos análise humana da política interna que impede nossa aplicação de consultar detalhes e preços de anúncios de terceiros. O objetivo do Oferta Certa é comparar produtos/ofertas e encaminhar visitantes ao anúncio correto, com afiliação oficial posteriormente.

Aplicação: **7046681029899344**. Site: **MLB**. Usuário retornado por `/users/me`: **3602341409**.

## Requisição principal reproduzida

- Data/hora UTC: **2026-09-16T22:12:26.860Z** (16/09/2026, 19:12:26 de Brasília).
- Método/URL: `GET https://api.mercadolibre.com/items/MLB6288254546`.
- Autorização: Bearer válido, omitido.
- HTTP: **403**.
- x-request-id: **0d83aa47-8616-43ef-ba7a-481b6edd50d7**.
- Origem: execução local no Windows do proprietário, com a mesma conexão OAuth armazenada pelo aplicativo. Região/IP não coletados.
- Corpo integral recebido, sem cortes nem alterações:

```json
{"message":"Access to the requested resource is forbidden","error":"access_denied","status":403,"cause":null}
```

Consulta de preço: `GET https://api.mercadolibre.com/items/MLB6288254546/sale_price?context=channel_marketplace`.
UTC: 2026-09-16T22:12:27.028Z. HTTP 403. x-request-id: `4f89efd5-f370-46a8-afe9-b41478ceabe1`.

```json
{"code":"access_denied","error":"Access to the requested resource is forbidden","status":403}
```

## Matriz de controles na mesma janela

Todos os testes abaixo utilizaram o mesmo token válido, sem alteração de permissões entre as chamadas.

| Método e URL | HTTP | x-request-id |
|---|---:|---|
| GET `https://api.mercadolibre.com/users/me` | 200 | `2205cbf5-cacc-4065-91e4-8d536f0ff317` |
| GET `https://api.mercadolibre.com/applications/7046681029899344` | 200 | `0c3edcd2-d09c-43b6-a889-05974f988ca7` |
| GET `https://api.mercadolibre.com/applications/7046681029899344/grants` | 200 | `ba1bd75a-6615-4515-be9f-49875b6786da` |
| GET `https://api.mercadolibre.com/products/search?site_id=MLB&status=active&q=iPhone%2015%20128%20GB&limit=3` | 200 | `ef4d64c3-fb8d-4bc3-9037-f25232310386` |
| GET `https://api.mercadolibre.com/products/MLB27172667/items?limit=3` | 200 | `fc0204fd-4fe2-4396-9d76-136eda0c4ee0` |
| GET `https://api.mercadolibre.com/sites/MLB/search?q=iPhone%2015%20128%20GB&limit=3` | 403 | `15667d74-c6bd-45a7-9b8b-b7008d07b006` |
| GET `https://api.mercadolibre.com/items/MLB6288254546` | 403 | `0d83aa47-8616-43ef-ba7a-481b6edd50d7` |
| GET `https://api.mercadolibre.com/items/MLB6288254546/sale_price?context=channel_marketplace` | 403 | `4f89efd5-f370-46a8-afe9-b41478ceabe1` |
| GET `https://api.mercadolibre.com/items/MLB7514973182` | 403 | `a667bc45-3630-4fbd-b05e-082cab79c212` |
| GET `https://api.mercadolibre.com/items/MLB7514973182/sale_price?context=channel_marketplace` | 403 | `506ce7fb-c671-4359-a454-c77ef784ac8c` |
| GET `https://api.mercadolibre.com/items/bulk?ids=MLB6288254546,MLB7514973182` | 200 | `87d9b3b1-5c35-4271-8145-bfbbb089084f` |

O envelope de `/items/bulk` respondeu 200, mas **os dois elementos retornaram status_code=403**. Isso não representa leitura bem-sucedida dos anúncios.

Aplicação: active=true, sandbox_mode=false, blocked=false, partial_blocked.blocked=false, disabled=false. Grant correspondente ao usuário encontrado, incluindo as permissões publish-sync/read-only. Conta ativa. `status.list.allow=false` e `address_pending` persistem, apesar de endereços de entrega e fiscal já visíveis no site. Não há evidência de que essa restrição de publicação cause recusa de leitura. Certificação not_certified, sem confirmação de que seja a causa. Nenhuma restrição de IP foi configurada por nós; a interface disponível não expõe esse gerenciamento.

## Perguntas objetivas

1. Qual política, habilitação ou validação negou o request ID principal?
2. Esta aplicação está autorizada a consultar detalhes públicos, permalink e preço de venda de anúncios de terceiros para comparação?
3. Se faltar habilitação, qual procedimento oficial está disponível para aplicação não certificada?
4. `address_pending` interfere nesses GETs? Se sim, qual campo/validação exato falta e onde corrigi-lo?
5. A documentação de sale_price contempla token de quem não é o vendedor, omitindo metadata privada. Qual requisito adicional impede a resposta básica neste caso?

A consulta anterior ao assistente automatizado retornou orientações genéricas, sem política identificada nem protocolo humano. Pedimos análise dos IDs nos logs internos ou decisão explícita sobre a disponibilidade do caso de uso.

Anexo técnico: `mercadolivre-support-local.json`, com horários por consulta, controles selecionados, corpos integrais dos erros e IDs das requisições. Não contém access token, refresh token, chave secreta, CPF, telefone ou endereço.

## Comparação com a Vercel

Ainda não foi executado um novo diagnóstico autenticado na Vercel nesta etapa: o acesso automatizado ao navegador foi interrompido. Para gerar a comparação, entrar em **Painel → Integrações → Configuração e registros da integração → Baixar diagnóstico para suporte**. O arquivo registra a plataforma e a região informada pelo servidor. Comparar resultados com o anexo local; não atribuir o bloqueio a IP/região apenas por suposição.

## Canal oficial

https://developers.mercadolivre.com.br/en_us/support

A documentação informa selecionar o país para acessar o formulário. A disponibilidade efetiva do formulário para esta conta não foi confirmada. Nenhum link privado de atendimento foi inventado e nenhum chamado foi enviado nesta etapa.

Referência de preço: https://developers.mercadolivre.com.br/pt_br/api-de-precos
